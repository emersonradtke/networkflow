import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { id, title, content, is_active } = await req.json();

    if (!title || !content) {
      return Response.json({ error: 'Title and content are required' }, { status: 400 });
    }

    let result;

    if (id) {
      // Update existing term
      result = await base44.asServiceRole.entities.TermsOfService.update(id, {
        title,
        content,
        is_active
      });
    } else {
      // Create new term - deactivate existing ones
      const allTerms = await base44.asServiceRole.entities.TermsOfService.list();
      const activeTerms = allTerms.filter(t => t.is_active);
      
      for (const term of activeTerms) {
        await base44.asServiceRole.entities.TermsOfService.update(term.id, { is_active: false });
      }

      const nextVersion = Math.max(...allTerms.map(t => t.version || 1), 0) + 1;
      
      result = await base44.asServiceRole.entities.TermsOfService.create({
        title,
        content,
        version: nextVersion,
        is_active: true
      });
    }

    return Response.json({ success: true, data: result });
  } catch (error) {
    console.error('Error saving terms:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});