import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const orders = await base44.asServiceRole.entities.Order.list('-order_number', 1);
  const maxNum = orders.length > 0 ? (orders[0].order_number || 0) : 0;
  return Response.json({ next_number: maxNum + 1 });
});