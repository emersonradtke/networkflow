import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Verifica e ativa um associado verificando o pagamento na InfinitePay
// Se force=true, ativa mesmo sem confirmação de pagamento
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

    const order_nsu = `ADES-${associate_id}`;

    // Verificar pagamento na InfinitePay
    const checkRes = await fetch('https://api.infinitepay.io/invoices/public/checkout/payment_check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        handle: 'boldlife',
        order_nsu: order_nsu,
        transaction_nsu: '',
        slug: '',
      }),
    });

    const checkData = await checkRes.json();
    console.log(`payment_check para ${order_nsu}:`, JSON.stringify(checkData));

    if (checkData.paid || force) {
      await base44.asServiceRole.entities.Associate.update(associate_id, {
        adhesion_paid: true,
        adhesion_payment_id: checkData.transaction_nsu || order_nsu,
        status: 'active',
      });

      return Response.json({
        success: true,
        forced: !checkData.paid && !!force,
        message: checkData.paid
          ? 'Associado ativado com sucesso (pagamento confirmado)'
          : 'Associado ativado manualmente (forçado pelo admin)',
        payment_check: checkData,
      });
    }

    return Response.json({
      success: false,
      message: 'Pagamento não confirmado pela InfinitePay',
      payment_check: checkData,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});