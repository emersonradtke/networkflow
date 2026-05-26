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

    // Gera hash da senha
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Verifica se já existe um DirectUser para este CPF
    const existingDirectUsers = await base44.asServiceRole.entities.DirectUser.filter({ cpf });

    let directUser;

    if (existingDirectUsers.length > 0) {
      // Já existe — apenas atualiza a senha e garante role correto
      directUser = existingDirectUsers[0];
      await base44.asServiceRole.entities.DirectUser.update(directUser.id, {
        password_hash: hashHex,
        role: 'associate',
        is_active: true
      });
      directUser = { ...directUser, password_hash: hashHex, role: 'associate' };
    } else {
      // Não existe — cria novo DirectUser
      const username = associate.email ? associate.email.split('@')[0] : cpf.slice(0, 10);

      // Verifica se username já está em uso
      const existingByUsername = await base44.asServiceRole.entities.DirectUser.filter({ username });
      const finalUsername = existingByUsername.length > 0 ? `${username}_${cpf.slice(-4)}` : username;

      directUser = await base44.asServiceRole.entities.DirectUser.create({
        username: finalUsername,
        email: associate.email || `${finalUsername}@boldlife.local`,
        cpf,
        password_hash: hashHex,
        role: 'associate',
        is_active: true
      });

      // Vincula o DirectUser ao Associate
      await base44.asServiceRole.entities.Associate.update(associate.id, {
        user_id: directUser.id
      });
    }

    return Response.json({
      success: true,
      user: {
        id: directUser.id,
        username: directUser.username,
        email: associate.email,
        full_name: associate.full_name,
        role: 'associate',
        cpf
      }
    });
  } catch (error) {
    console.error('Create first access user error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});