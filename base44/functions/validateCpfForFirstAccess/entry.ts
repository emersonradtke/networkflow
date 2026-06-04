import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { cpf, person_type } = await req.json();

    const isPf = person_type === 'pf' || !person_type;
    const document = cpf;
    const docType = isPf ? 'CPF' : 'CNPJ';
    const docLength = isPf ? 11 : 14;

    if (!document || document.length !== docLength) {
      return Response.json({ error: `${docType} inválido` }, { status: 400 });
    }

    // Busca associado pelo CPF ou CNPJ
    const searchKey = isPf ? { cpf: document } : { cnpj: document };
    const associates = await base44.asServiceRole.entities.Associate.filter(searchKey);
    
    if (!associates || associates.length === 0) {
      return Response.json({ error: `${docType} não encontrado no sistema` }, { status: 404 });
    }

    // Verifica se já existe DirectUser com senha cadastrada
    const existingDirectUsers = await base44.asServiceRole.entities.DirectUser.filter({ cpf: document });

    if (existingDirectUsers.length > 0 && existingDirectUsers[0].password_hash) {
      return Response.json({ 
        success: false,
        already_registered: true
      });
    }

    // Documento válido e sem senha cadastrada — pode prosseguir para definir senha
    return Response.json({ success: true, associate_id: associates[0].id });
  } catch (error) {
    console.error('Document validation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});