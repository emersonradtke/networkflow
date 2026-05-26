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

    // CPF válido — pode prosseguir para definir senha
    // (não importa se já tem user_id — o createFirstAccessUser vai criar ou atualizar)
    return Response.json({ success: true, associate_id: associate.id });
  } catch (error) {
    console.error('CPF validation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});