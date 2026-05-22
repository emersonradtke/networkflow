import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Buscar PendingUserSetup para o email do usuário logado
    const pendings = await base44.asServiceRole.entities.PendingUserSetup.filter({ email: user.email, applied: false });
    
    if (pendings.length === 0) {
      return Response.json({ success: true, applied: 0, message: 'Nenhum setup pendente' });
    }

    const pending = pendings[0];

    // Atualizar Associate se existe
    if (pending.associate_id) {
      await base44.asServiceRole.entities.Associate.update(pending.associate_id, {
        user_id: user.id,
        status: 'active',
      });
    }

    // Atualizar User com role e nome
    const updates = {};
    if (pending.full_name) updates.full_name = pending.full_name;
    if (pending.role) updates.role = pending.role;

    if (Object.keys(updates).length > 0) {
      await base44.asServiceRole.entities.User.update(user.id, updates);
    }

    // Marcar como aplicado
    await base44.asServiceRole.entities.PendingUserSetup.update(pending.id, { applied: true });

    return Response.json({ 
      success: true, 
      applied: 1,
      message: 'Configurações aplicadas com sucesso',
      associate_id: pending.associate_id,
    });
  } catch (error) {
    console.error('Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});