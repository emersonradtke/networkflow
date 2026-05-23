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

    // Obter todos os termos ativos
    const activeTerms = await base44.asServiceRole.entities.TermsOfService.filter({ is_active: true });

    if (activeTerms.length === 0) {
      return Response.json({ needs_acceptance: false });
    }

    // Separar por tipo
    const tos = activeTerms.find(t => (t.term_type || 'terms_of_service') === 'terms_of_service');
    const pp = activeTerms.find(t => t.term_type === 'privacy_policy');

    // Verificar aceites do usuário para cada tipo
    const pendingTerms = [];

    for (const term of [tos, pp].filter(Boolean)) {
      const acceptances = await base44.asServiceRole.entities.UserTermsAcceptance.filter({
        user_id: user.id,
        terms_id: term.id,
        terms_version: term.version
      });
      if (acceptances.length === 0) {
        pendingTerms.push(term);
      }
    }

    const needsAcceptance = pendingTerms.length > 0;

    return Response.json({
      needs_acceptance: needsAcceptance,
      current_terms: tos || null,
      current_privacy: pp || null,
      pending_terms: pendingTerms,
      last_acceptance: null
    });
  } catch (error) {
    console.error('Error checking terms status:', error);
    return Response.json({ needs_acceptance: false }, { status: 200 });
  }
});