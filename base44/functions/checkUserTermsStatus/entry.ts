import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { user_id } = await req.json();

    if (!user_id) {
      return Response.json({ error: 'user_id is required' }, { status: 400 });
    }

    // Buscar todos os documentos obrigatórios e ativos
    const allTerms = await base44.asServiceRole.entities.TermsOfService.list('-created_date', 200);
    // is_mandatory: undefined/null/true => obrigatório. Só false == não obrigatório.
    const mandatoryActive = allTerms.filter(t =>
      t.is_active === true && t.is_mandatory !== false
    );

    if (mandatoryActive.length === 0) {
      return Response.json({ needs_acceptance: false, pending_terms: [] });
    }

    // Para cada documento obrigatório ativo, verificar se o usuário já aceitou a versão atual
    const pendingTerms = [];

    for (const term of mandatoryActive) {
      const acceptances = await base44.asServiceRole.entities.UserTermsAcceptance.filter({
        user_id: user_id,
        terms_id: term.id,
        terms_version: term.version
      });

      if (acceptances.length === 0) {
        pendingTerms.push(term);
      }
    }

    return Response.json({
      needs_acceptance: pendingTerms.length > 0,
      pending_terms: pendingTerms,
      total_mandatory: mandatoryActive.length,
      total_pending: pendingTerms.length
    });
  } catch (error) {
    console.error('Error checking terms status:', error);
    return Response.json({ needs_acceptance: false, pending_terms: [] }, { status: 200 });
  }
});