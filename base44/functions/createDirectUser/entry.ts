import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { username, email, password, cpf, role } = await req.json();

    if (!username || !password || !cpf) {
      return Response.json({ error: 'Usuário, senha e CPF são obrigatórios' }, { status: 400 });
    }

    // Verificar se usuário já existe
    const existingUsers = await base44.asServiceRole.entities.DirectUser.filter({ username });
    if (existingUsers.length > 0) {
      return Response.json({ error: 'Usuário já existe' }, { status: 400 });
    }

    // Criar hash simples da senha (em produção usar bcrypt)
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Criar usuário na entidade DirectUser
    const newUser = await base44.asServiceRole.entities.DirectUser.create({
      username,
      email: email || `${username}@boldlife.local`,
      cpf,
      password_hash: hashHex,
      role: role === 'admin' ? 'admin' : 'user',
      is_active: true
    });

    return Response.json({ 
      success: true, 
      message: 'Usuário criado com sucesso',
      userId: newUser.id
    });
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});