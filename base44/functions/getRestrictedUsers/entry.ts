import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Verificar se o solicitante é admin
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const allUsers = await base44.asServiceRole.entities.User.list('-created_date', 200);
    const restricted = allUsers.filter(u => u.role && u.role !== 'admin' && u.role !== 'associate');

    return Response.json({ users: restricted });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});