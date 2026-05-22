import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let user = null;

    // Tenta autenticação nativa primeiro
    try {
      user = await base44.auth.me();
    } catch (err) {
      // Se falhar, retorna false (sem aceitar termos é um estado válido)
      return Response.json({ needs_acceptance: false });
    }

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Obter termos ativos
    const activeTerms = await base44.asServiceRole.entities.TermsOfService.filter({ is_active: true });
    
    if (activeTerms.length === 0) {
      return Response.json({ needs_acceptance: false });
    }

    const currentTerms = activeTerms[0];

    // Verificar se o usuário já aceitou esta versão
    const acceptances = await base44.asServiceRole.entities.UserTermsAcceptance.filter({
      user_id: user.id,
      terms_id: currentTerms.id,
      terms_version: currentTerms.version
    });

    const needsAcceptance = acceptances.length === 0;

    return Response.json({
      needs_acceptance: needsAcceptance,
      current_terms: currentTerms,
      last_acceptance: acceptances[0] || null
    });
  } catch (error) {
    console.error('Error checking terms status:', error);
    return Response.json({ needs_acceptance: false }, { status: 200 });
  }
});