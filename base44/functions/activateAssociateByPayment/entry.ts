import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Verifica e ativa um associado verificando o pagamento na InfinitePay.
// Se force=true, ativa mesmo sem confirmação de pagamento (apenas admin).
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { associate_id, force } = await req.json();

    if (!associate_id) {
      return Response.json({ error: 'associate_id é obrigatório' }, { status: 400 });
    }

    const associates = await base44.asServiceRole.entities.Associate.filter({ id: associate_id });
    if (associates.length === 0) {
      return Response.json({ error: 'Associado não encontrado' }, { status: 404 });
    }

    const associate = associates[0];
    const handle = Deno.env.get('INFINITEPAY_HANDLE') || 'boldlife';
    const order_nsu = `ADES-${associate_id}`;

    const checkRes = await fetch('https://api.infinitepay.io/invoices/public/checkout/payment_check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        handle,
        order_nsu,
        transaction_nsu: '',
        slug: '',
      }),
    });

    const checkData = await checkRes.json();

    if (checkData.paid || force) {
      await base44.asServiceRole.entities.Associate.update(associate_id, {
        adhesion_paid: true,
        adhesion_payment_id: checkData.transaction_nsu || order_nsu,
        status: 'active',
      });

      // Audit log
      const ip = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown';
      await base44.asServiceRole.entities.AuditLog.create({
        user_id: user.id,
        user_email: user.email,
        associate_id: associate_id,
        action: 'associate_activate',
        entity_type: 'Associate',
        entity_id: associate_id,
        before_data: JSON.stringify({ status: associate.status, adhesion_paid: associate.adhesion_paid }),
        after_data: JSON.stringify({ status: 'active', adhesion_paid: true, forced: !checkData.paid && !!force }),
        ip_address: ip,
        user_agent: req.headers.get('user-agent') || 'unknown',
        origin: 'admin',
        notes: force && !checkData.paid ? 'Ativação forçada pelo admin (sem confirmação de pagamento)' : 'Ativação com pagamento confirmado',
        occurred_at: new Date().toISOString(),
      });

      return Response.json({
        success: true,
        forced: !checkData.paid && !!force,
        message: checkData.paid
          ? 'Associado ativado com sucesso (pagamento confirmado)'
          : 'Associado ativado manualmente (forçado pelo admin)',
      });
    }

    return Response.json({
      success: false,
      message: 'Pagamento não confirmado pela InfinitePay',
    });
  } catch (error) {
    return Response.json({ error: 'Erro interno ao processar ativação' }, { status: 500 });
  }
});