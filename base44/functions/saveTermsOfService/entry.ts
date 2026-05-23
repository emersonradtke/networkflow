import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { id, title, content, is_active, term_type } = await req.json();

    if (!title || !content) {
      return Response.json({ error: 'Title and content are required' }, { status: 400 });
    }

    const type = term_type || 'terms_of_service';

    // Sempre cria nova versão (edição gera nova versão para forçar novo aceite)
    // Desativa todos os termos ativos deste tipo
    const allTerms = await base44.asServiceRole.entities.TermsOfService.list();
    const sameTypeTerms = allTerms.filter(t => (t.term_type || 'terms_of_service') === type);
    const activeOfType = sameTypeTerms.filter(t => t.is_active);

    for (const term of activeOfType) {
      await base44.asServiceRole.entities.TermsOfService.update(term.id, { is_active: false });
    }

    const nextVersion = Math.max(...sameTypeTerms.map(t => t.version || 1), 0) + 1;

    const result = await base44.asServiceRole.entities.TermsOfService.create({
      title,
      content,
      term_type: type,
      version: nextVersion,
      is_active: true
    });

    return Response.json({ success: true, data: result });
  } catch (error) {
    console.error('Error saving terms:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});