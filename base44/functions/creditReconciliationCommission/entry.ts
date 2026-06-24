import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await req.json();
    const { link_id } = body;

    if (!link_id) {
      return Response.json({ error: 'link_id é obrigatório' }, { status: 400 });
    }

    // Buscar a intenção de compra
    const links = await base44.asServiceRole.entities.ExternalLinkClick.filter({ id: link_id });
    const link = links[0];
    if (!link) {
      return Response.json({ error: 'Link not found' }, { status: 404 });
    }

    const ip = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown';

    // Creditar na wallet do associado
    if (link.commission_amount && link.commission_amount > 0) {
      const associateArr = await base44.asServiceRole.entities.Associate.filter({ id: link.associate_id });
      const associate = associateArr[0];
      if (associate) {
        const newBalance = (associate.wallet_balance || 0) + link.commission_amount;
        const newEarned = (associate.total_earned || 0) + link.commission_amount;

        await base44.asServiceRole.entities.Associate.update(link.associate_id, {
          wallet_balance: newBalance,
          total_earned: newEarned
        });

        // Audit log — crédito financeiro
        await base44.asServiceRole.entities.AuditLog.create({
          user_id: user.id,
          user_email: user.email,
          associate_id: link.associate_id,
          action: 'wallet_credit',
          entity_type: 'ExternalLinkClick',
          entity_id: link_id,
          before_data: JSON.stringify({ wallet_balance: associate.wallet_balance, total_earned: associate.total_earned }),
          after_data: JSON.stringify({ wallet_balance: newBalance, total_earned: newEarned, commission_amount: link.commission_amount }),
          ip_address: ip,
          user_agent: req.headers.get('user-agent') || 'unknown',
          origin: 'admin',
          notes: `Comissão de compra por link externo conciliada — purchase_amount: R$ ${link.purchase_amount?.toFixed(2)}`,
          occurred_at: new Date().toISOString(),
        });

        await base44.asServiceRole.entities.Notification.create({
          associate_id: link.associate_id,
          title: 'Comissão Creditada!',
          message: `Sua comissão de R$ ${Number(link.commission_amount).toFixed(2)} foi creditada em sua carteira.`,
          type: 'commission',
          link: '/wallet'
        });
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('[creditReconciliationCommission] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});