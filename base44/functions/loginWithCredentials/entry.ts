import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return Response.json({ error: 'Usuário e senha são obrigatórios' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    
    // Buscar usuário direto na base sem autenticação - busca por username
    let users = [];
    try {
      users = await base44.asServiceRole.entities.DirectUser.filter({ username });
    } catch (e) {
      console.error('Error filtering users by username:', e);
      // Fallback: tenta buscar por CPF se username falhar
      try {
        users = await base44.asServiceRole.entities.DirectUser.filter({ cpf: username });
      } catch (e2) {
        console.error('Error filtering users by cpf:', e2);
        return Response.json({ error: 'Erro ao validar usuário' }, { status: 500 });
      }
    }
    
    const user = users[0];
    
    if (!user) {
      return Response.json({ error: 'Usuário ou senha inválidos' }, { status: 401 });
    }

    if (!user.is_active) {
      return Response.json({ error: 'Usuário desativado' }, { status: 401 });
    }

    // Validar senha com SHA-256
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