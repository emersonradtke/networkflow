import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

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
      t.is_active !== false && t.is_mandatory !== false
    );

    if (mandatoryActive.length === 0) {
      return Response.json({ needs_acceptance: false, pending_terms: [] });
    }

    // Para cada documento obrigatório ativo, verificar se o usuário já aceitou a versão atual
    const pendingTerms = [];

    // Buscar todas as aceitações do usuário de uma vez
    const allAcceptances = await base44.asServiceRole.entities.UserTermsAcceptance.filter({ user_id: user_id }, '-created_date', 500);

    for (const term of mandatoryActive) {
      const hasAccepted = allAcceptances.some(a =>
        a.terms_id === term.id && Number(a.terms_version) === Number(term.version)
      );
      if (!hasAccepted) {
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