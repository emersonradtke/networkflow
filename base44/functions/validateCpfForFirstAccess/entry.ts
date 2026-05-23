import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { cpf } = await req.json();

    if (!cpf || cpf.length !== 11) {
      return Response.json({ error: 'CPF inválido' }, { status: 400 });
    }

    // Busca associado pelo CPF
    const associates = await base44.asServiceRole.entities.Associate.filter({ cpf });
    
    if (!associates || associates.length === 0) {
      return Response.json({ error: 'CPF não encontrado no sistema' }, { status: 404 });
    }

    const associate = associates[0];

    // Verifica se já tem usuário criado
    if (associate.user_id) {
      return Response.json({ 
        success: false,
        already_registered: true,
        error: 'Já existe uma senha cadastrada para este CPF. Use a recuperação de senha.' 
      }, { status: 400 });
    }

    // CPF válido e associado existe
    return Response.json({ success: true, associate_id: associate.id });
  } catch (error) {
    console.error('CPF validation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});