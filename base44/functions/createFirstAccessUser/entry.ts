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
      return Response.json({ error: 'Esta conta já foi ativada' }, { status: 400 });
    }

    // Gera username baseado no CPF (primeiros 10 dígitos ou email)
    const username = associate.email ? associate.email.split('@')[0] : cpf.slice(0, 10);

    // Invoca função para criar usuário direto
    const createUserResponse = await base44.asServiceRole.functions.invoke('createDirectUser', {
      username,
      cpf,
      password,
      role: 'user',
      associate_id: associate.id
    });

    if (createUserResponse.data?.success) {
      return Response.json({
        success: true,
        user: {
          id: associate.id,
          email: associate.email,
          full_name: associate.full_name,
          role: 'user',
          cpf
        }
      });
    } else {
      return Response.json({ 
        error: createUserResponse.data?.error || 'Erro ao criar acesso' 
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Create first access user error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});