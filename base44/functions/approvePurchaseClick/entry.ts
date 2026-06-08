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

    if (!click_id) {
      return Response.json({ error: 'click_id é obrigatório' }, { status: 400 });
    }

    // Usar service role para garantir acesso independente de RLS
    const clicks = await base44.asServiceRole.entities.ExternalLinkClick.filter({ id: click_id });
    const click = clicks[0];
    if (!click) {
      return Response.json({ error: 'Click not found' }, { status: 404 });
    }

    const newStatus = approved ? 'approved' : 'rejected';

    await base44.asServiceRole.entities.ExternalLinkClick.update(click_id, {
      status: newStatus,
      admin_notes: admin_notes || ''
    });

    const ip = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown';

    if (approved && click.commission_amount > 0) {
      const associateArr = await base44.asServiceRole.entities.Associate.filter({ id: click.associate_id });
      const associate = associateArr[0];
      if (associate) {
        const newBalance = (associate.wallet_balance || 0) + click.commission_amount;
        const newEarned = (associate.total_earned || 0) + click.commission_amount;

        await base44.asServiceRole.entities.Associate.update(click.associate_id, {
          wallet_balance: newBalance,
          total_earned: newEarned
        });

        // Audit log — crédito financeiro
        await base44.asServiceRole.entities.AuditLog.create({
          user_id: user.id,
          user_email: user.email,
          associate_id: click.associate_id,
          action: 'wallet_credit',
          entity_type: 'ExternalLinkClick',
          entity_id: click_id,
          before_data: JSON.stringify({ wallet_balance: associate.wallet_balance, total_earned: associate.total_earned }),
          after_data: JSON.stringify({ wallet_balance: newBalance, total_earned: newEarned, commission_amount: click.commission_amount }),
          ip_address: ip,
          user_agent: req.headers.get('user-agent') || 'unknown',
          origin: 'admin',
          notes: `Comissão de compra aprovada — purchase_amount: R$ ${click.purchase_amount?.toFixed(2)}`,
          occurred_at: new Date().toISOString(),
        });

        await base44.asServiceRole.entities.Notification.create({
          associate_id: click.associate_id,
          title: 'Compra Aprovada!',
          message: `Sua compra de R$ ${Number(click.purchase_amount).toFixed(2)} foi aprovada. Comissão de R$ ${Number(click.commission_amount).toFixed(2)} creditada.`,
          type: 'commission',
          link: '/wallet'
        });
      }
    } else if (!approved) {
      await base44.asServiceRole.entities.Notification.create({
        associate_id: click.associate_id,
        title: 'Compra Rejeitada',
        message: `Sua compra não foi aprovada. ${admin_notes ? 'Motivo: ' + admin_notes : ''}`,
        type: 'order',
        link: '/orders'
      });

      // Audit log — rejeição
      await base44.asServiceRole.entities.AuditLog.create({
        user_id: user.id,
        user_email: user.email,
        associate_id: click.associate_id,
        action: 'commission_reject',
        entity_type: 'ExternalLinkClick',
        entity_id: click_id,
        before_data: JSON.stringify({ status: click.status }),
        after_data: JSON.stringify({ status: 'rejected', admin_notes }),
        ip_address: ip,
        user_agent: req.headers.get('user-agent') || 'unknown',
        origin: 'admin',
        notes: admin_notes || '',
        occurred_at: new Date().toISOString(),
      });
    }

    return Response.json({ success: true, status: newStatus });
  } catch (error) {
    return Response.json({ error: 'Erro interno ao processar aprovação' }, { status: 500 });
  }
});