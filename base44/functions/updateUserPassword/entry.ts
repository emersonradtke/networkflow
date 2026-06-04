import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { userId, newPassword } = await req.json();

    if (!userId || !newPassword) {
      return Response.json({ error: 'userId e newPassword são obrigatórios' }, { status: 400 });
    }

    if (newPassword.trim().length < 6) {
      return Response.json({ error: 'Senha deve ter pelo menos 6 caracteres' }, { status: 400 });
    }

    // Atualizar a senha do usuário usando asServiceRole
    await base44.asServiceRole.entities.User.update(userId, {
      password: newPassword
    });

    return Response.json({ success: true, message: 'Senha atualizada com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar senha:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});