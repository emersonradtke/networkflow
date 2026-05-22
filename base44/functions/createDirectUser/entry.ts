import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { username, email, password, role } = await req.json();

    if (!username || !password || !role) {
      return Response.json({ error: 'Usuário, senha e role são obrigatórios' }, { status: 400 });
    }

    // Validar role
    let baseRole = role === 'admin' ? 'admin' : 'user';

    // Gerar email se não fornecido
    const userEmail = email || `${username}@boldlife.local`;

    // Verificar se email já está em uso
    const existingUsers = await base44.asServiceRole.entities.User.filter({ email: userEmail });
    if (existingUsers.length > 0) {
      return Response.json({ error: 'Email já cadastrado' }, { status: 400 });
    }

    // Convidar usuário
    await base44.users.inviteUser(userEmail, baseRole);

    // Criar PendingUserSetup com role customizado e username
    await base44.asServiceRole.entities.PendingUserSetup.create({
      email: userEmail,
      full_name: username,
      role,
      applied: false,
    });

    return Response.json({ 
      success: true, 
      message: 'Usuário criado com sucesso',
      userId: userEmail
    });
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});