import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { user_id } = await req.json();

    if (!user_id) {
      return Response.json({ error: 'user_id required' }, { status: 400 });
    }

    // Verificar se o solicitante é admin
    const callerList = await base44.asServiceRole.entities.DirectUser.filter({ id: user_id });
    const caller = callerList[0];
    if (!caller || caller.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const allUsers = await base44.asServiceRole.entities.User.list('-created_date', 200);
    const restricted = allUsers.filter(u => u.role && u.role !== 'admin' && u.role !== 'associate');

    return Response.json({ users: restricted });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});