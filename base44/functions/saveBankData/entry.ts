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

    // Whitelist de campos permitidos (proteção contra mass assignment)
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

    // SECURITY: usuário só pode atualizar seus próprios dados bancários
    if (user.role !== 'admin') {
      const ownerUserId = associateRecord.user_id;
      const ownerEmail = associateRecord.email;
      const isOwner = (ownerUserId && ownerUserId === user.id) || (ownerEmail && ownerEmail === user.email);
      if (!isOwner) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Snapshot dos dados anteriores (sem informações completas — apenas campos afetados)
    const beforeSnapshot = Object.fromEntries(
      Object.keys(safeData).map(k => [k, associateRecord[k] || null])
    );

    await base44.asServiceRole.entities.Associate.update(associateId, safeData);

    // Audit log — alteração de dados bancários
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown';
    await base44.asServiceRole.entities.AuditLog.create({
      user_id: user.id,
      user_email: user.email,
      associate_id: associateId,
      action: 'bank_data_update',
      entity_type: 'Associate',
      entity_id: associateId,
      before_data: JSON.stringify(beforeSnapshot),
      after_data: JSON.stringify(safeData),
      ip_address: ip,
      user_agent: req.headers.get('user-agent') || 'unknown',
      origin: user.role === 'admin' ? 'admin' : 'web',
      occurred_at: new Date().toISOString(),
    });

    return Response.json({ success: true, associate_id: associateId });
  } catch (error) {
    console.error('saveBankData error:', error);
    return Response.json({ error: 'Erro interno ao salvar dados bancários' }, { status: 500 });
  }
});