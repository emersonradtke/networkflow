import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json();
    const { click_id, purchase_proof_urls, purchase_amount } = body;

    if (!click_id) {
      return Response.json({ error: 'click_id é obrigatório' }, { status: 400 });
    }
    if (!purchase_amount || isNaN(Number(purchase_amount))) {
      return Response.json({ error: 'purchase_amount é obrigatório' }, { status: 400 });
    }
    const proofUrls = purchase_proof_urls || [];
    if (proofUrls.length === 0) {
      return Response.json({ error: 'Pelo menos um comprovante é obrigatório' }, { status: 400 });
    }

    // Buscar o clique diretamente pelo ID
    let click = null;
    try {
      click = await base44.asServiceRole.entities.ExternalLinkClick.get(click_id);
    } catch (_) {
      return Response.json({ error: 'Intenção de compra não encontrada' }, { status: 404 });
    }

    // Calcular comissão com base no produto ou banner
    let commission_amount = 0;
    if (click.link_type === 'product' && click.product_id) {
      try {
        const product = await base44.asServiceRole.entities.Product.get(click.product_id);
        if (product) {
          commission_amount = (Number(purchase_amount) * (product.commission_percent || 0)) / 100;
        }
      } catch (_) { /* produto não encontrado, comissão fica 0 */ }
    } else if (click.link_type === 'banner' && click.banner_id) {
      try {
        const banner = await base44.asServiceRole.entities.StoreBanner.get(click.banner_id);
        if (banner) {
          commission_amount = (Number(purchase_amount) * (banner.commission_percent || 0)) / 100;
        }
      } catch (_) { /* banner não encontrado, comissão fica 0 */ }
    }

    // Atualizar o clique com os comprovantes e mudar status para submitted
    await base44.asServiceRole.entities.ExternalLinkClick.update(click_id, {
      purchase_proof_url: proofUrls[0],
      purchase_proof_urls: proofUrls,
      purchase_amount: Number(purchase_amount),
      commission_amount,
      status: 'submitted'
    });

    // Notificar admins (best-effort)
    try {
      const associate = await base44.asServiceRole.entities.Associate.get(click.associate_id);
      const adminUsers = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
      for (const adminUser of adminUsers) {
        const adminAssocs = await base44.asServiceRole.entities.Associate.filter({ user_id: adminUser.id });
        if (adminAssocs.length > 0) {
          await base44.asServiceRole.entities.Notification.create({
            associate_id: adminAssocs[0].id,
            title: 'Compra Pendente de Confirmação',
            message: `${associate?.full_name || 'Associado'} enviou comprovante(s) no valor de R$ ${Number(purchase_amount).toFixed(2)}`,
            type: 'order',
            link: '/admin/external-links'
          });
        }
      }
    } catch (_) { /* notificação é opcional */ }

    return Response.json({ success: true, commission_amount });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});