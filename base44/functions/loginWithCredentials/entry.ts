import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return Response.json({ error: 'Usuário e senha são obrigatórios' }, { status: 400 });
    }

    // Usar serviço direto sem autenticação (é uma função pública de login)
    const base44 = createClientFromRequest(req);
    
    // Usar asServiceRole para acessar DirectUser sem autenticação do usuário
    const users = await base44.asServiceRole.entities.DirectUser.filter({ username });
    
    if (users.length === 0) {
      return Response.json({ error: 'Usuário ou senha inválidos' }, { status: 401 });
    }

    const user = users[0];

    if (!user.is_active) {
      return Response.json({ error: 'Usuário desativado' }, { status: 401 });
    }

    // Validar senha
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    if (hashHex !== user.password_hash) {
      return Response.json({ error: 'Usuário ou senha inválidos' }, { status: 401 });
    }

    return Response.json({ 
      success: true,
      token: 'auth_token_validated',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        cpf: user.cpf
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});