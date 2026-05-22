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

    // Gerar email se não fornecido
    const userEmail = email || `cpf_${cpf}@boldlife.local`;

    // Verificar se email já está em uso
    const existingPending = await base44.asServiceRole.entities.PendingUserSetup.filter({ email: userEmail });
    if (existingPending.length > 0) {
      return Response.json({ error: 'Email já tem um convite pendente' }, { status: 400 });
    }

    // Convidar usuário
    await base44.users.inviteUser(userEmail, baseRole);

    // Criar PendingUserSetup com role customizado
    await base44.asServiceRole.entities.PendingUserSetup.create({
      email: userEmail,
      full_name,
      role,
      applied: false,
    });

    return Response.json({ 
      success: true, 
      message: 'Convite enviado para ' + userEmail + '. O role será aplicado automaticamente quando o usuário fizer o primeiro acesso.',
      pending: true
    });
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});