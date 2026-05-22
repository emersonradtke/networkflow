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

    // Criar usuário via API do Base44 com autenticação de serviço
    const apiToken = Deno.env.get('BASE44_SERVICE_TOKEN') || '';
    const createUserResponse = await fetch('https://api.base44.com/users/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken}`
      },
      body: JSON.stringify({
        email: userEmail,
        password,
        full_name: username,
        role: baseRole,
      })
    });

    if (!createUserResponse.ok) {
      const errData = await createUserResponse.json();
      return Response.json({ error: errData.error || 'Erro ao criar usuário' }, { status: 400 });
    }

    const createdUser = await createUserResponse.json();

    return Response.json({ 
      success: true, 
      message: 'Usuário criado com sucesso',
      userId: createdUser.id || userEmail
    });
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});