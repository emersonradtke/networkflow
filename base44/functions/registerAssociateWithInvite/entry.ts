import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

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

    // Verificar se CPF/CNPJ já existe em Associate
    const docField = person_type === 'pf' ? 'cpf' : 'cnpj';
    const existing = await base44.asServiceRole.entities.Associate.filter({ [docField]: docRaw });
    
    if (existing.length > 0) {
      return Response.json({ 
        error: person_type === 'pf' ? 'CPF já cadastrado' : 'CNPJ já cadastrado' 
      }, { status: 400 });
    }

    // Gerar email se não fornecido
    let finalEmail = email?.trim() || `cpf_${docRaw}@boldlife.local`;

    // Verificar se email já está em uso
    const existingUsers = await base44.asServiceRole.entities.User.filter({ email: finalEmail });
    const existingPending = await base44.asServiceRole.entities.PendingUserSetup.filter({ email: finalEmail });

    if (existingUsers.length > 0 || existingPending.length > 0) {
      return Response.json({ error: 'Email já cadastrado na plataforma' }, { status: 400 });
    }

    // Criar Associate
    const associate = await base44.asServiceRole.entities.Associate.create({
      full_name,
      email: finalEmail,
      phone: phone.replace(/\D/g, ''),
      cpf: person_type === 'pf' ? docRaw : '',
      cnpj: person_type === 'pj' ? docRaw : '',
      company_name: person_type === 'pj' ? company_name : '',
      person_type,
      status: 'awaiting_activation',
      sponsor_id: sponsor_id || null,
      sponsor_name: sponsor_name || null,
      invite_code: Math.random().toString(36).substring(2, 10).toUpperCase(),
      wallet_balance: 0,
      total_earned: 0,
      total_withdrawn: 0,
      adhesion_paid: false,
    });

    // Enviar convite Base44
    await base44.users.inviteUser(finalEmail, 'user');

    // Criar PendingUserSetup com role customizado
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
    return Response.json({ error: error.message }, { status: 500 });
  }
});