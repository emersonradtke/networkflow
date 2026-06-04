import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

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

    // Verifica se já existe DirectUser com senha cadastrada
    const existingDirectUsers = await base44.asServiceRole.entities.DirectUser.filter({ cpf });

    if (existingDirectUsers.length > 0 && existingDirectUsers[0].password_hash) {
      return Response.json({ 
        success: false,
        already_registered: true
      });
    }

    // CPF válido e sem senha cadastrada — pode prosseguir para definir senha
    return Response.json({ success: true, associate_id: associates[0].id });
  } catch (error) {
    console.error('CPF validation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});