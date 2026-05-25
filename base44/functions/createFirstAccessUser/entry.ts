import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { cpf, password } = await req.json();

    if (!cpf || !password) {
      return Response.json({ error: 'CPF e senha são obrigatórios' }, { status: 400 });
    }

    if (password.length < 6) {
      return Response.json({ error: 'Senha deve ter pelo menos 6 caracteres' }, { status: 400 });
    }

    // Busca associado pelo CPF
    const associates = await base44.asServiceRole.entities.Associate.filter({ cpf });
    
    if (!associates || associates.length === 0) {
      return Response.json({ error: 'Associado não encontrado' }, { status: 404 });
    }

    const associate = associates[0];

    // Verifica se já foi ativado
    if (associate.user_id) {
      return Response.json({ error: 'Esta conta já foi ativada', already_registered: true }, { status: 400 });
    }

    // Gera username baseado no email ou CPF
    const username = associate.email ? associate.email.split('@')[0] : cpf.slice(0, 10);

    // Verificar se username já existe
    const existingUsers = await base44.asServiceRole.entities.DirectUser.filter({ username });
    const finalUsername = existingUsers.length > 0 ? `${username}_${cpf.slice(-4)}` : username;

    // Gera hash da senha
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Cria DirectUser diretamente usando service role (sem precisar de admin logado)
    const newDirectUser = await base44.asServiceRole.entities.DirectUser.create({
      username: finalUsername,
      email: associate.email || `${finalUsername}@boldlife.local`,
      cpf,
      password_hash: hashHex,
      role: 'user',
      is_active: true
    });

    // Atualiza associate com user_id do DirectUser
    await base44.asServiceRole.entities.Associate.update(associate.id, {
      user_id: newDirectUser.id
    });

    return Response.json({
      success: true,
      user: {
        id: newDirectUser.id,
        username: finalUsername,
        email: associate.email,
        full_name: associate.full_name,
        role: 'user',
        cpf
      }
    });
  } catch (error) {
    console.error('Create first access user error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});