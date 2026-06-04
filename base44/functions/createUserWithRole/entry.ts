import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { email, full_name, role, associate_id } = await req.json();

    if (!email || !full_name || !role) {
      return Response.json({ error: 'Email, nome e role são obrigatórios' }, { status: 400 });
    }

    // Verificar se email já existe
    const existingUsers = await base44.asServiceRole.entities.User.filter({ email });
    if (existingUsers.length > 0) {
      return Response.json({ error: 'Email já cadastrado' }, { status: 400 });
    }

    // Verificar se role existe
    const roleExists = await base44.asServiceRole.entities.Role.filter({ name: role });
    if (roleExists.length === 0) {
      return Response.json({ error: 'Role não encontrado' }, { status: 400 });
    }

    // Verificar se email já está em uso
    const existingPending = await base44.asServiceRole.entities.PendingUserSetup.filter({ email });
    if (existingPending.length > 0) {
      return Response.json({ error: 'Email já tem um convite pendente' }, { status: 400 });
    }

    // Convidar usuário
    try {
      await base44.users.inviteUser(email, 'user');
    } catch (inviteErr) {
      console.error('Erro no inviteUser:', inviteErr);
      return Response.json({ error: 'Erro ao convidar usuário: ' + (inviteErr.message || 'desconhecido') }, { status: 500 });
    }

    // Criar ou atualizar PendingUserSetup
    const existing = await base44.asServiceRole.entities.PendingUserSetup.filter({ email, applied: false });
    if (existing.length > 0) {
      await base44.asServiceRole.entities.PendingUserSetup.update(existing[0].id, {
        full_name, role, associate_id: associate_id || null
      });
    } else {
      await base44.asServiceRole.entities.PendingUserSetup.create({
        email, full_name, role, associate_id: associate_id || null, applied: false
      });
    }

    return Response.json({ 
      success: true, 
      message: 'Convite enviado para ' + email + '. O role será aplicado automaticamente quando o usuário fizer o primeiro acesso.',
      pending: true
    });
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});