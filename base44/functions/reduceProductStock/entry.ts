import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { items } = await req.json(); // [{id, stock, qty}]
    if (!items || items.length === 0) {
      return Response.json({ success: true });
    }

    for (const item of items) {
      await base44.asServiceRole.entities.Product.update(item.id, {
        stock: Math.max(0, (item.stock || 0) - item.qty)
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});