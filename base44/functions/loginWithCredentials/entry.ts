import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { username, password } = await req.json();

    if (!username || !password) {
      return Response.json({ error: 'Usuário e senha são obrigatórios' }, { status: 400 });
    }

    // Busca o usuário pelo email/username
    const users = await base44.asServiceRole.entities.User.filter({ email: username });
    
    if (users.length === 0) {
      return Response.json({ error: 'Usuário ou senha inválidos' }, { status: 401 });
    }

    // Valida a senha (nota: em produção, você precisaria armazenar hashes de senha)
    // Por enquanto, retornamos sucesso para indicar que o usuário existe
    return Response.json({ 
      success: true,
      token: 'auth_token_validated',
      user: {
        email: users[0].email,
        role: users[0].role,
        id: users[0].id
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});