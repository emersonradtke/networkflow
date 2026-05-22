import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { cpf, full_name, email, role } = await req.json();

    if (!cpf || !full_name || !role) {
      return Response.json({ error: 'CPF, nome e role são obrigatórios' }, { status: 400 });
    }

    // Verificar se usuário com esse email já existe
    if (email) {
      const existingUsers = await base44.asServiceRole.entities.User.filter({ email });
      if (existingUsers.length > 0) {
        return Response.json({ error: 'Email já cadastrado' }, { status: 400 });
      }
    }

    // Convidar usuário com email gerado ou fornecido
    const userEmail = email || `${cpf}@boldlife.local`;
    await base44.users.inviteUser(userEmail, role);

    // Buscar o usuário criado
    const createdUsers = await base44.asServiceRole.entities.User.filter({ email: userEmail });
    const newUser = createdUsers[0];

    return Response.json({ 
      success: true, 
      user: {
        id: newUser.id,
        full_name: newUser.full_name,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});