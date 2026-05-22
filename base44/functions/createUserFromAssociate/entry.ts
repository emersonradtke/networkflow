import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    // Executar apenas no evento de criação
    if (event?.type !== 'create') {
      return Response.json({ success: true });
    }

    const associate = data;

    // Verificar se já existe usuário com este CPF
    const existingUser = await base44.asServiceRole.entities.User.filter({
      cpf: associate.cpf
    });

    if (existingUser && existingUser.length > 0) {
      return Response.json({ success: true, message: 'Usuário já existe' });
    }

    // Criar usuário automaticamente
    const tempPassword = Math.random().toString(36).slice(-10);
    await base44.asServiceRole.entities.User.create({
      cpf: associate.cpf,
      full_name: associate.full_name,
      email: associate.email || `${associate.cpf}@boldlife.local`,
      role: 'user',
      password: tempPassword
    });

    return Response.json({ success: true, message: 'Usuário criado automaticamente' });
  } catch (error) {
    console.error('Erro ao criar usuário do associado:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});