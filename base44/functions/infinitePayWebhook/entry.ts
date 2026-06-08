import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Webhook recebe POST da InfinitePay quando pagamento é aprovado.
// SEMPRE verificar com payment_check antes de executar ações irreversíveis.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const rawBody = await req.text();

    // SECURITY: Validar shared secret no header (configurar no painel InfinitePay)
    const webhookSecret = Deno.env.get('INFINITEPAY_WEBHOOK_SECRET');
    if (webhookSecret) {
      const receivedSecret = req.headers.get('x-webhook-secret') || req.headers.get('x-infinitepay-signature') || '';
      if (receivedSecret !== webhookSecret) {
        console.warn('Webhook rejeitado: secret inválido');
        return new Response('Unauthorized', { status: 401 });
      }
    }

    let body;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return new Response('Bad Request', { status: 400 });
    }

    const { order_nsu, transaction_nsu, invoice_slug, capture_method } = body;

    if (!order_nsu) {
      return new Response('OK', { status: 200 });
    }

    const handle = Deno.env.get('INFINITEPAY_HANDLE') || 'boldlife';

    // Verificação obrigatória via payment_check antes de liberar qualquer pedido
    const checkRes = await fetch('https://api.infinitepay.io/invoices/public/checkout/payment_check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        handle,
        order_nsu: String(order_nsu),
        transaction_nsu: transaction_nsu || '',
        slug: invoice_slug || '',
      }),
    });

    const checkData = await checkRes.json();

    // Só prosseguir se paid === true
    if (!checkData.paid) {
      return new Response('OK', { status: 200 });
    }

    const ip = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'webhook';

    if (order_nsu.startsWith('ADES-')) {
      const associateId = order_nsu.replace('ADES-', '');
      const associates = await base44.asServiceRole.entities.Associate.filter({ id: associateId });
      if (associates.length > 0) {
        const before = associates[0];
        await base44.asServiceRole.entities.Associate.update(associateId, {
          adhesion_paid: true,
          adhesion_payment_id: transaction_nsu || order_nsu,
          status: 'active',
        });

        // Audit log
        await base44.asServiceRole.entities.AuditLog.create({
          user_id: associateId,
          associate_id: associateId,
          action: 'associate_activate',
          entity_type: 'Associate',
          entity_id: associateId,
          before_data: JSON.stringify({ status: before.status, adhesion_paid: before.adhesion_paid }),
          after_data: JSON.stringify({ status: 'active', adhesion_paid: true, payment_id: transaction_nsu || order_nsu }),
          ip_address: ip,
          origin: 'webhook',
          notes: `Ativação via webhook InfinitePay — order_nsu: ${order_nsu}`,
          occurred_at: new Date().toISOString(),
        });
      }

    } else if (order_nsu.startsWith('CART-') || order_nsu.startsWith('PUB-')) {
       const cartId = order_nsu.startsWith('CART-') ? order_nsu.replace('CART-', '') : order_nsu.replace('PUB-', '');
       const orders = await base44.asServiceRole.entities.Order.filter({ cart_id: cartId });
      for (const order of orders) {
        await base44.asServiceRole.entities.Order.update(order.id, {
          status: 'paid',
          payment_id: transaction_nsu || order_nsu,
          payment_method: checkData.capture_method || capture_method || '',
        });

        // Audit log por pedido
        await base44.asServiceRole.entities.AuditLog.create({
          associate_id: order.associate_id,
          action: 'order_create',
          entity_type: 'Order',
          entity_id: order.id,
          before_data: JSON.stringify({ status: order.status }),
          after_data: JSON.stringify({ status: 'paid', payment_id: transaction_nsu || order_nsu }),
          ip_address: ip,
          origin: 'webhook',
          notes: `Pedido pago via webhook InfinitePay — cart_id: ${cartId}`,
          occurred_at: new Date().toISOString(),
        });
      }
    }

    return new Response('OK', { status: 200 });
  } catch (error) {
    // Retornar 200 para evitar reenvios da InfinitePay, mas logar o erro
    console.error('Webhook error:', error.message);
    return new Response('OK', { status: 200 });
  }
});