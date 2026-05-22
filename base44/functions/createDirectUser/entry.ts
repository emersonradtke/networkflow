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

    // Validar role (Base44 só aceita 'user' ou 'admin', mapeamos outros roles para 'user')
    const validBaseRoles = ['user', 'admin'];
    let baseRole = 'user';
    
    if (role === 'admin') {
      baseRole = 'admin';
    }
    // Todos os outros roles (associate, employee, guest, franchise, partner) usam 'user' como base
    // mas o custom role será armazenado no campo 'role' da entidade User

    // Verificar se usuário com esse email já existe
    if (email) {
      const existingUsers = await base44.asServiceRole.entities.User.filter({ email });
      if (existingUsers.length > 0) {
        return Response.json({ error: 'Email já cadastrado' }, { status: 400 });
      }
    }

    // Convidar usuário com email gerado ou fornecido
    const userEmail = email || `${cpf}@boldlife.local`;
    await base44.users.inviteUser(userEmail, baseRole);

    // Aguardar um pouco para o usuário ser criado no sistema
    await new Promise(resolve => setTimeout(resolve, 500));

    // Buscar o usuário criado com retry
    let createdUsers = await base44.asServiceRole.entities.User.filter({ email: userEmail });
    
    if (!createdUsers || createdUsers.length === 0) {
      // Tentar novamente após um pouco mais de espera
      await new Promise(resolve => setTimeout(resolve, 1000));
      createdUsers = await base44.asServiceRole.entities.User.filter({ email: userEmail });
    }

    if (!createdUsers || createdUsers.length === 0) {
      return Response.json({ error: 'Erro ao criar usuário - não encontrado após criação' }, { status: 500 });
    }

    const newUser = createdUsers[0];

    // Atualizar nome e role customizado
    const updates = { full_name };
    if (role !== baseRole) {
      updates.role = role;
    }
    
    await base44.asServiceRole.entities.User.update(newUser.id, updates);

    return Response.json({ 
      success: true, 
      user: {
        id: newUser.id,
        full_name,
        email: userEmail,
        role
      }
    });
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});