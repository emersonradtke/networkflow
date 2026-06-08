import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { associate_id, cpf, email, bankData } = body;

    if (!bankData || typeof bankData !== 'object') {
      return Response.json({ error: 'bankData é obrigatório' }, { status: 400 });
    }

    // Campos permitidos para atualização bancária (whitelist)
    const allowedFields = ['pix_key', 'pix_key_type', 'bank_code', 'bank_name', 'bank_account_type', 'bank_agency', 'bank_agency_digit', 'bank_account', 'bank_account_digit', 'bank_info'];
    const safeData = Object.fromEntries(Object.entries(bankData).filter(([k]) => allowedFields.includes(k)));

    // Resolver o ID do associate
    let associateId = associate_id;
    let associateRecord = null;

    if (associateId) {
      const found = await base44.asServiceRole.entities.Associate.filter({ id: associateId });
      associateRecord = found[0] || null;
    }

    if (!associateRecord) {
      // Tentar pelo user_id do usuário logado
      const byUser = await base44.asServiceRole.entities.Associate.filter({ user_id: user.id });
      if (byUser.length > 0) {
        associateRecord = byUser[0];
        associateId = byUser[0].id;
      }
    }

    if (!associateRecord && cpf) {
      const byCpf = await base44.asServiceRole.entities.Associate.filter({ cpf });
      if (byCpf.length > 0) {
        associateRecord = byCpf[0];
        associateId = byCpf[0].id;
      }
    }

    if (!associateRecord && email) {
      const byEmail = await base44.asServiceRole.entities.Associate.filter({ email });
      if (byEmail.length > 0) {
        associateRecord = byEmail[0];
        associateId = byEmail[0].id;
      }
    }

    if (!associateRecord || !associateId) {
      return Response.json({ error: 'Associate não encontrado' }, { status: 404 });
    }

    // SECURITY: Se não for admin, garantir que o usuário só pode atualizar seus próprios dados
    if (user.role !== 'admin') {
      const ownerUserId = associateRecord.user_id;
      const ownerEmail = associateRecord.email;
      const isOwner = (ownerUserId && ownerUserId === user.id) || (ownerEmail && ownerEmail === user.email);
      if (!isOwner) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    await base44.asServiceRole.entities.Associate.update(associateId, safeData);

    return Response.json({ success: true, associate_id: associateId });
  } catch (error) {
    console.error('saveBankData error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});