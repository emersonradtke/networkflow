import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user || user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

  // Busca todos os pedidos sem order_number, ordenados por data de criação
  const allOrders = await base44.asServiceRole.entities.Order.list('created_date', 500);
  const unnumbered = allOrders.filter(o => !o.order_number);

  if (unnumbered.length === 0) return Response.json({ message: 'Todos os pedidos já possuem número', updated: 0 });

  // Pega o maior número atual
  const numbered = allOrders.filter(o => o.order_number);
  let counter = numbered.length > 0 ? Math.max(...numbered.map(o => o.order_number)) : 0;

  // Agrupa por cart_id (pedidos do mesmo carrinho recebem o mesmo order_number)
  const cartGroups = {};
  for (const o of unnumbered) {
    const key = o.cart_id || o.id; // fallback para id se não tem cart_id
    if (!cartGroups[key]) cartGroups[key] = [];
    cartGroups[key].push(o);
  }

  // Ordena grupos pela data de criação do primeiro item do grupo
  const sortedGroups = Object.values(cartGroups).sort((a, b) =>
    new Date(a[0].created_date) - new Date(b[0].created_date)
  );

  let updated = 0;
  for (const group of sortedGroups) {
    counter++;
    for (const order of group) {
      await base44.asServiceRole.entities.Order.update(order.id, { order_number: counter });
      updated++;
    }
  }

  return Response.json({ message: `${updated} pedidos numerados`, updated });
});