import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { cpf, full_name, email, role, password } = await req.json();

    if (!cpf || !full_name || !role) {
      return Response.json({ error: 'CPF, nome e role são obrigatórios' }, { status: 400 });
    }

    // Criar usuário diretamente usando asServiceRole
    const newUser = await base44.asServiceRole.entities.User.create({
      cpf,
      full_name,
      email: email || `${cpf}@boldlife.local`,
      role,
      password: password || Math.random().toString(36).slice(-10)
    });

    return Response.json({ 
      success: true, 
      user: {
        id: newUser.id,
        cpf: newUser.cpf,
        full_name: newUser.full_name,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});