import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { click_id, purchase_proof_url, purchase_amount } = body;

    // Atualizar registro de clique
    const click = await base44.entities.ExternalLinkClick.get(click_id);
    if (!click) {
      return Response.json({ error: 'Click not found' }, { status: 404 });
    }

    // Verificar se pertence ao usuário
    const associate = await base44.entities.Associate.filter({ user_id: user.id }, '', 1);
    if (!associate || associate[0].id !== click.associate_id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Calcular comissão baseado no tipo de link
    let commission_amount = 0;
    if (click.link_type === 'product' && click.product_id) {
      const product = await base44.entities.Product.get(click.product_id);
      if (product) {
        commission_amount = (purchase_amount * product.commission_percent) / 100;
      }
    } else if (click.link_type === 'banner' && click.banner_id) {
      const banner = await base44.entities.StoreBanner.get(click.banner_id);
      if (banner) {
        commission_amount = (purchase_amount * banner.commission_percent) / 100;
      }
    }

    // Atualizar clique com comprovante
    await base44.entities.ExternalLinkClick.update(click_id, {
      purchase_proof_url: purchase_proof_url,
      purchase_amount: purchase_amount,
      commission_amount: commission_amount,
      status: 'submitted'
    });

    // Criar notificação para admin revisar
    const admins = await base44.entities.Associate.filter({ status: 'active' }, '', 100);
    for (const admin of admins) {
      if (admin.role === 'admin') {
        await base44.entities.Notification.create({
          associate_id: admin.id,
          title: 'Compra Pendente de Confirmação',
          message: `${click.associate_name} enviou comprovante de compra de R$ ${purchase_amount.toFixed(2)}`,
          type: 'order',
          link: `/admin/external-links`
        });
      }
    }

    return Response.json({ success: true, commission_amount });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});