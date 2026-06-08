import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json();
    const { associate_id } = body;

    if (!associate_id) {
      return Response.json({ error: 'associate_id obrigatorio' }, { status: 400 });
    }

    const configs = await base44.asServiceRole.entities.NetworkConfig.list();
    const config = configs[0];
    const target = config?.monthly_activation_amount || 0;

    if (!target || target <= 0) {
      return Response.json({ skipped: true });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const orders = await base44.asServiceRole.entities.Order.filter({ associate_id, status: 'paid' });
    const proofs = await base44.asServiceRole.entities.CardSpendingProof.filter({ associate_id, month: currentMonth, status: 'approved' });

    const ordersTotal = orders.filter(o => o.created_date >= startOfMonth).reduce((s, o) => s + (o.amount || 0), 0);
    const proofsTotal = proofs.reduce((s, p) => s + (p.spending_amount || 0), 0);
    const totalSpent = ordersTotal + proofsTotal;

    if (totalSpent < target) {
      return Response.json({ notified: false, totalSpent, target });
    }

    const existingNotifs = await base44.asServiceRole.entities.Notification.filter({ associate_id, type: 'system' });
    const alreadyNotified = existingNotifs.some(n => n.title?.includes('Ativacao Mensal') && n.created_date >= startOfMonth);

    if (alreadyNotified) {
      return Response.json({ notified: false, reason: 'already notified' });
    }

    await base44.asServiceRole.entities.Notification.create({
      associate_id,
      title: 'Ativacao Mensal Concluida!',
      message: `Parabens! Voce atingiu a meta de R$ ${target.toFixed(2)} de gasto mensal.`,
      type: 'system',
      is_read: false,
    });

    return Response.json({ notified: true, totalSpent, target });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});