import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return Response.json({ error: 'Usuário e senha são obrigatórios' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    
    // Buscar todos os usuários e filtrar localmente
    let users = [];
    try {
      const allUsers = await base44.asServiceRole.entities.DirectUser.list();
      users = allUsers.filter(u => u.username === username || u.cpf === username);
    } catch (e) {
      console.error('Error fetching users:', e.message);
      return Response.json({ error: 'Erro ao validar usuário' }, { status: 500 });
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

    // Buscar o associate vinculado a este DirectUser
    let associate = null;
    try {
      const allAssociates = await base44.asServiceRole.entities.Associate.list();
      const byUserId = allAssociates.filter(a => a.user_id === user.id);
      const byCpf = allAssociates.filter(a => a.cpf === user.cpf);
      
      associate = byUserId[0] || byCpf[0] || null;
      
      // Se encontrou por CPF mas user_id não está linkado, linkar agora
      if (associate && !associate.user_id) {
        await base44.asServiceRole.entities.Associate.update(associate.id, { user_id: user.id });
        associate.user_id = user.id;
      }
    } catch (assocErr) {
      console.warn('Could not load associate:', assocErr.message);
    }

    // Bloquear login se associate está pendente (aguardando pagamento de adesão)
    if (associate && associate.status === 'pending') {
      return Response.json({ 
        success: false,
        error: 'Sua adesão está aguardando confirmação de pagamento',
        requiresPayment: true,
        associate
      }, { status: 401 });
    }

    return Response.json({ 
      success: true,
      token: 'auth_token_validated',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role || 'associate',
        cpf: user.cpf,
        _associate: associate
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});