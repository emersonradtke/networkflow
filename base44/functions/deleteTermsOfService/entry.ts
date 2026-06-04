import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { id } = await req.json();

    if (!id) {
      return Response.json({ error: 'ID is required' }, { status: 400 });
    }

    await base44.asServiceRole.entities.TermsOfService.delete(id);
    return Response.json({ success: true });
  } catch (error) {
    console.error('Error deleting terms:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});