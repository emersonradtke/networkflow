import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // Use filter to get only the last order by order_number
    const orders = await base44.asServiceRole.entities.Order.list('-created_date', 1);
    const maxNum = orders.length > 0 ? (orders[0].order_number || 0) : 0;
    return Response.json({ next_number: maxNum + 1 });
  } catch (error) {
    console.error('[getNextOrderNumber] error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});