import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { direct_user_id } = await req.json();

    if (!direct_user_id) {
      return Response.json({ error: 'direct_user_id é obrigatório' }, { status: 400 });
    }

    // Busca o associado pelo user_id (ID do DirectUser)
    const associates = await base44.asServiceRole.entities.Associate.filter({ user_id: direct_user_id });

    return Response.json({
      associate: associates.length > 0 ? associates[0] : null
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});