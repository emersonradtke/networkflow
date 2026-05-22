import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

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

    // Convidar usuário
    await base44.users.inviteUser(email, 'user');

    // Aguardar criação
    await new Promise(resolve => setTimeout(resolve, 500));

    // Buscar o usuário criado
    let createdUsers = await base44.asServiceRole.entities.User.filter({ email });
    
    if (!createdUsers || createdUsers.length === 0) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      createdUsers = await base44.asServiceRole.entities.User.filter({ email });
    }

    if (!createdUsers || createdUsers.length === 0) {
      return Response.json({ error: 'Erro ao criar usuário' }, { status: 500 });
    }

    const newUser = createdUsers[0];

    // Atualizar com nome, role e associate_id
    const updates = { full_name, role };
    if (associate_id) {
      updates.associate_id = associate_id;
    }
    
    await base44.asServiceRole.entities.User.update(newUser.id, updates);

    return Response.json({ 
      success: true, 
      user: {
        id: newUser.id,
        full_name,
        email,
        role
      }
    });
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});