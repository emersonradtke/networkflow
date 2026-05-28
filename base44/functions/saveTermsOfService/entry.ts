import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { title, content, category, is_mandatory, effective_date } = await req.json();

    if (!title || !content) {
      return Response.json({ error: 'Title and content are required' }, { status: 400 });
    }

    const cat = category || 'terms_of_service';

    // Buscar todos os termos desta categoria para calcular versão
    const allTerms = await base44.asServiceRole.entities.TermsOfService.list('-created_date', 200);
    const sameCategoryTerms = allTerms.filter(t => (t.category || t.term_type || 'terms_of_service') === cat);
    const activeOfCategory = sameCategoryTerms.filter(t => t.is_active);

    // Desativar versões ativas desta categoria
    for (const term of activeOfCategory) {
      await base44.asServiceRole.entities.TermsOfService.update(term.id, { is_active: false });
    }

    const nextVersion = sameCategoryTerms.length > 0
      ? Math.max(...sameCategoryTerms.map(t => t.version || 1)) + 1
      : 1;

    const result = await base44.asServiceRole.entities.TermsOfService.create({
      title,
      content,
      category: cat,
      // Manter compatibilidade com campo antigo
      term_type: cat,
      version: nextVersion,
      is_active: true,
      is_mandatory: is_mandatory !== false,
      effective_date: effective_date || null,
      published_at: new Date().toISOString()
    });

    return Response.json({ success: true, data: result });
  } catch (error) {
    console.error('Error saving terms:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});