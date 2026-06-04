import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json();
    const { terms_id, terms_version, user_id, user_email, terms_title, terms_category } = body;

    if (!terms_id || !terms_version || !user_id) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const ipAddress = req.headers.get('x-forwarded-for') ||
      req.headers.get('x-real-ip') ||
      req.headers.get('cf-connecting-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    let deviceType = 'desktop';
    const ua = userAgent.toLowerCase();
    if (/mobile|android|iphone|ipod/.test(ua)) deviceType = 'mobile';
    else if (/tablet|ipad/.test(ua)) deviceType = 'tablet';

    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await base44.asServiceRole.entities.UserTermsAcceptance.create({
      user_id,
      user_email: user_email || '',
      terms_id,
      terms_version,
      terms_title: terms_title || '',
      terms_category: terms_category || '',
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