import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { full_name, email, phone, cpf, cnpj, company_name, person_type, sponsor_id, sponsor_name } = await req.json();

    if (!full_name || !phone || !person_type) {
      return Response.json({ error: 'Nome, telefone e tipo de pessoa são obrigatórios' }, { status: 400 });
    }

    const docRaw = person_type === 'pf' ? cpf?.replace(/\D/g, '') : cnpj?.replace(/\D/g, '');

    if (!docRaw || docRaw.length === 0) {
      return Response.json({ error: 'CPF ou CNPJ inválido' }, { status: 400 });
    }

    // Verificar se CPF/CNPJ já existe
    const docField = person_type === 'pf' ? 'cpf' : 'cnpj';
    const existing = await base44.asServiceRole.entities.Associate.filter({ [docField]: docRaw });
    if (existing.length > 0) {
      return Response.json({
        error: person_type === 'pf' ? 'CPF já cadastrado' : 'CNPJ já cadastrado'
      }, { status: 400 });
    }

    if (!email || !email.trim()) {
      return Response.json({ error: 'E-mail é obrigatório' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return Response.json({ error: 'E-mail inválido' }, { status: 400 });
    }

    const finalEmail = email.trim().toLowerCase();

    // Verificar duplicidade de email
    const existingUsers = await base44.asServiceRole.entities.User.filter({ email: finalEmail });
    const existingPending = await base44.asServiceRole.entities.PendingUserSetup.filter({ email: finalEmail });
    const existingAssociates = await base44.asServiceRole.entities.Associate.filter({ email: finalEmail });

    if (existingUsers.length > 0 || existingPending.length > 0 || existingAssociates.length > 0) {
      return Response.json({ error: 'Email já cadastrado na plataforma' }, { status: 400 });
    }

    // Gerar invite_code criptograficamente seguro
    const randomBytes = new Uint8Array(6);
    crypto.getRandomValues(randomBytes);
    const invite_code = Array.from(randomBytes)
      .map(b => b.toString(36).toUpperCase())
      .join('')
      .substring(0, 8);

    // Criar Associate
    const associate = await base44.asServiceRole.entities.Associate.create({
      full_name,
      email: finalEmail,
      phone: phone.replace(/\D/g, ''),
      cpf: person_type === 'pf' ? docRaw : '',
      cnpj: person_type === 'pj' ? docRaw : '',
      company_name: person_type === 'pj' ? company_name : '',
      person_type,
      status: 'pending',
      sponsor_id: sponsor_id || null,
      sponsor_name: sponsor_name || null,
      invite_code,
      wallet_balance: 0,
      total_earned: 0,
      total_withdrawn: 0,
      adhesion_paid: false,
    });

    // Registrar audit log
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown';
    await base44.asServiceRole.entities.AuditLog.create({
      associate_id: associate.id,
      action: 'register',
      entity_type: 'Associate',
      entity_id: associate.id,
      after_data: JSON.stringify({ full_name, email: finalEmail, person_type, sponsor_id }),
      ip_address: ip,
      user_agent: req.headers.get('user-agent') || 'unknown',
      origin: 'web',
      notes: `Novo associado registrado via convite de: ${sponsor_name || 'direto'}`,
      occurred_at: new Date().toISOString(),
    });

    // Enviar convite Base44
    try {
      await base44.users.inviteUser(finalEmail, 'user');
    } catch (inviteErr) {
      console.warn('Falha ao enviar convite, continuando:', inviteErr.message);
    }

    // Criar PendingUserSetup
    await base44.asServiceRole.entities.PendingUserSetup.create({
      email: finalEmail,
      full_name,
      role: 'associate',
      associate_id: associate.id,
      applied: false,
    });

    return Response.json({
      success: true,
      message: `Convite enviado para ${finalEmail}. Verifique sua caixa de entrada.`,
      associate_id: associate.id,
    });
  } catch (error) {
    console.error('Erro ao registrar associado:', error);
    return Response.json({ error: 'Erro interno ao processar cadastro' }, { status: 500 });
  }
});