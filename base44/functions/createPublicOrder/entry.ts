import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Public endpoint — no auth required (public storefront)
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { cart, consultant_id, consultant_name, customer_info } = await req.json();

    if (!cart || cart.length === 0 || !consultant_id || !customer_info?.name) {
      return Response.json({ error: 'Dados obrigatórios ausentes' }, { status: 400 });
    }

    // Get next order number
    const lastOrders = await base44.asServiceRole.entities.Order.list('-order_number', 1);
    const orderNumber = (lastOrders[0]?.order_number || 0) + 1;
    const cartId = `pub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    for (const item of cart) {
      await base44.asServiceRole.entities.Order.create({
        order_number: orderNumber,
        cart_id: cartId,
        associate_id: consultant_id,
        associate_name: consultant_name,
        product_id: item.id,
        product_name: item.name,
        product_type: item.type || 'direct_sale',
        quantity: item.qty,
        unit_price: item.price,
        amount: item.price * item.qty,
        commission_percent: item.commission_associate || 0,
        status: 'pending',
        notes: `Venda pública. Cliente: ${customer_info.name} (${customer_info.email || ''})${customer_info.phone ? `, Tel: ${customer_info.phone}` : ''}`,
      });

      if (item.type !== 'external_link') {
        await base44.asServiceRole.entities.Product.update(item.id, {
          stock: Math.max(0, (item.stock || 0) - item.qty)
        });
      }
    }

    return Response.json({ cart_id: cartId, order_number: orderNumber });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});