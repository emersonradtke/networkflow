import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { doc, password } = await req.json();

    if (!doc || !password) {
      return Response.json({ error: 'CPF/CNPJ e senha são obrigatórios.' }, { status: 400 });
    }

    const { role } = await req.clone().json().catch(() => ({})) || {};

    // Buscar associado pelo CPF ou CNPJ
    const cleanDoc = doc.replace(/\D/g, '');
    let associates = [];

    if (cleanDoc.length === 11) {
      associates = await base44.asServiceRole.entities.Associate.filter({ cpf: cleanDoc });
    } else if (cleanDoc.length === 14) {
      associates = await base44.asServiceRole.entities.Associate.filter({ cnpj: cleanDoc });
    } else {
      return Response.json({ error: 'CPF ou CNPJ inválido.' }, { status: 400 });
    }

    if (!associates || associates.length === 0) {
      return Response.json({ error: 'Associado não encontrado com este documento.' }, { status: 401 });
    }

    const associate = associates[0];

    if (associate.status === 'blocked') {
      return Response.json({ error: 'Sua conta está bloqueada. Entre em contato com o suporte.' }, { status: 403 });
    }

    if (associate.status === 'inactive') {
      return Response.json({ error: 'Sua conta está inativa.' }, { status: 403 });
    }

    // Verificar senha (armazenada como hash simples ou texto — adaptar conforme o sistema)
    // Por padrão, usamos o CPF/CNPJ como senha inicial se não houver senha cadastrada
    const storedPassword = associate.password || cleanDoc;
    if (password !== storedPassword) {
      return Response.json({ error: 'Senha incorreta.' }, { status: 401 });
    }

    // Retornar dados do associado (sem a senha)
    const { password: _pw, ...safeAssociate } = associate;

    return Response.json({ associate: safeAssociate });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});