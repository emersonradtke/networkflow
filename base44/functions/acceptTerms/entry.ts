import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json();
    const { terms_id, terms_version, user_id, user_email } = body;

    if (!terms_id || !terms_version) {
      return Response.json({ error: 'Missing terms_id or terms_version' }, { status: 400 });
    }

    if (!user_id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const effectiveUserId = user_id;
    const effectiveEmail = user_email || '';

    // Buscar dados do termo para snapshot
    const term = await base44.asServiceRole.entities.TermsOfService.filter({ id: terms_id });
    const termData = term[0] || null;

    // Extrair dados de auditoria do request
    const ipAddress = req.headers.get('x-forwarded-for') ||
      req.headers.get('x-real-ip') ||
      req.headers.get('cf-connecting-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Detectar tipo de dispositivo pelo user agent
    let deviceType = 'desktop';
    const ua = userAgent.toLowerCase();
    if (/mobile|android|iphone|ipod/.test(ua)) deviceType = 'mobile';
    else if (/tablet|ipad/.test(ua)) deviceType = 'tablet';

    // Gerar session ID único
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await base44.asServiceRole.entities.UserTermsAcceptance.create({
      user_id: effectiveUserId,
      user_email: effectiveEmail,
      terms_id: terms_id,
      terms_version: terms_version,
      terms_title: termData?.title || '',
      terms_category: termData?.category || termData?.term_type || '',
      accepted_at: new Date().toISOString(),
      ip_address: ipAddress,
      user_agent: userAgent,
      device_type: deviceType,
      session_id: sessionId
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error accepting terms:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});