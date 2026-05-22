import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Webhook recebe POST da InfinitePay quando pagamento é aprovado
// Payload: { invoice_slug, amount, paid_amount, capture_method, transaction_nsu, order_nsu, receipt_url, items }
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { order_nsu, transaction_nsu, receipt_url, capture_method, paid_amount } = body;

    if (!order_nsu) {
      return Response.json({ error: 'order_nsu ausente' }, { status: 400 });
    }

    // order_nsu pode ser:
    // "CART-{cartId}"  → pedidos do carrinho
    // "ADES-{associateId}" → taxa de adesão

    if (order_nsu.startsWith('ADES-')) {
      const associateId = order_nsu.replace('ADES-', '');
      const associates = await base44.asServiceRole.entities.Associate.filter({ id: associateId });
      if (associates.length > 0) {
        await base44.asServiceRole.entities.Associate.update(associateId, {
          adhesion_paid: true,
          adhesion_payment_id: transaction_nsu || order_nsu,
          status: 'active',
        });
      }
    } else if (order_nsu.startsWith('CART-')) {
      // Atualizar todos os pedidos do cart_id para paid
      const cartId = order_nsu.replace('CART-', '');
      const orders = await base44.asServiceRole.entities.Order.filter({ cart_id: cartId });
      for (const order of orders) {
        await base44.asServiceRole.entities.Order.update(order.id, {
          status: 'paid',
          payment_id: transaction_nsu || order_nsu,
          payment_method: capture_method || '',
        });
      }
    }

    // Responder 200 para confirmar recebimento
    return new Response('OK', { status: 200 });
  } catch (error) {
    // Retornar 200 mesmo em erro para evitar reenvios, mas logar o erro
    console.error('Webhook error:', error.message);
    return new Response('OK', { status: 200 });
  }
});