import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Buscar todos os setups pendentes
    const pendings = await base44.asServiceRole.entities.PendingUserSetup.filter({ applied: false });
    
    let appliedCount = 0;
    
    for (const pending of pendings) {
      // Buscar o usuário pelo email
      const users = await base44.asServiceRole.entities.User.filter({ email: pending.email });
      
      if (users && users.length > 0) {
        const targetUser = users[0];
        const updates = {};
        if (pending.full_name) updates.full_name = pending.full_name;
        if (pending.role) updates.role = pending.role;
        if (pending.associate_id) updates.associate_id = pending.associate_id;

        if (Object.keys(updates).length > 0) {
          await base44.asServiceRole.entities.User.update(targetUser.id, updates);
        }
        await base44.asServiceRole.entities.PendingUserSetup.update(pending.id, { applied: true });
        appliedCount++;
      }
    }

    return Response.json({ success: true, applied: appliedCount, total_pending: pendings.length });
  } catch (error) {
    console.error('Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});