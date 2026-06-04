import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const orders = await base44.asServiceRole.entities.Order.list('-order_number', 1);
    const maxNum = orders.length > 0 ? (orders[0].order_number || 0) : 0;
    return Response.json({ next_number: maxNum + 1 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});