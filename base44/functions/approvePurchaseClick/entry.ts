import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { click_id, approved, admin_notes } = body;

    const click = await base44.entities.ExternalLinkClick.get(click_id);
    if (!click) {
      return Response.json({ error: 'Click not found' }, { status: 404 });
    }

    const newStatus = approved ? 'approved' : 'rejected';

    // Atualizar status
    await base44.entities.ExternalLinkClick.update(click_id, {
      status: newStatus,
      admin_notes: admin_notes || ''
    });

    // Se aprovado, creditar comissão
    if (approved && click.commission_amount > 0) {
      const associate = await base44.entities.Associate.get(click.associate_id);
      if (associate) {
        // Adicionar saldo na carteira
        const newBalance = (associate.wallet_balance || 0) + click.commission_amount;
        const newEarned = (associate.total_earned || 0) + click.commission_amount;

        await base44.entities.Associate.update(click.associate_id, {
          wallet_balance: newBalance,
          total_earned: newEarned
        });

        // Criar notificação de aprovação
        await base44.entities.Notification.create({
          associate_id: click.associate_id,
          title: 'Compra Aprovada!',
          message: `Sua compra de R$ ${click.purchase_amount.toFixed(2)} foi aprovada. Comissão de R$ ${click.commission_amount.toFixed(2)} creditada.`,
          type: 'commission',
          link: '/wallet'
        });
      }
    } else {
      // Notificar rejeição
      await base44.entities.Notification.create({
        associate_id: click.associate_id,
        title: 'Compra Rejeitada',
        message: `Sua compra não foi aprovada. ${admin_notes ? 'Motivo: ' + admin_notes : ''}`,
        type: 'order',
        link: '/orders'
      });
    }

    return Response.json({ success: true, status: newStatus });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});