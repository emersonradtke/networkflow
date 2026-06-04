import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const users = await base44.asServiceRole.entities.User.list();
    
    let deleted = 0;
    const deletedUsers = [];

    for (const u of users) {
      if (u.role !== 'admin') {
        try {
          await base44.asServiceRole.entities.User.delete(u.id);
          deleted++;
          deletedUsers.push({ id: u.id, email: u.email, role: u.role });
        } catch (error) {
          console.error(`Erro ao deletar user ${u.id}:`, error.message);
        }
      }
    }

    return Response.json({
      success: true,
      message: `${deleted} usuários não-admin removidos`,
      deleted,
      deleted_users: deletedUsers
    });
  } catch (error) {
    console.error('Erro:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});