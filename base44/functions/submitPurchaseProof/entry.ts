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

    if (!click_id || !purchase_proof_url || !purchase_amount) {
      return Response.json({ error: 'Dados obrigatórios ausentes' }, { status: 400 });
    }

    // Buscar registro de clique
    const clicks = await base44.asServiceRole.entities.ExternalLinkClick.filter({ id: click_id });
    const click = clicks[0];
    if (!click) {
      return Response.json({ error: 'Click not found' }, { status: 404 });
    }

    // Verificar se pertence ao usuário
    const associates = await base44.entities.Associate.filter({ user_id: user.id });
    if (!associates || associates.length === 0 || associates[0].id !== click.associate_id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Calcular comissão baseado no tipo de link
    let commission_amount = 0;
    if (click.link_type === 'product' && click.product_id) {
      const products = await base44.asServiceRole.entities.Product.filter({ id: click.product_id });
      const product = products[0];
      if (product) {
        commission_amount = (purchase_amount * (product.commission_percent || 0)) / 100;
      }
    } else if (click.link_type === 'banner' && click.banner_id) {
      const banners = await base44.asServiceRole.entities.StoreBanner.filter({ id: click.banner_id });
      const banner = banners[0];
      if (banner) {
        commission_amount = (purchase_amount * (banner.commission_percent || 0)) / 100;
      }
    }

    // Atualizar clique com comprovante
    await base44.asServiceRole.entities.ExternalLinkClick.update(click_id, {
      purchase_proof_url,
      purchase_amount,
      commission_amount,
      status: 'submitted'
    });

    // Notificar admins via User (role = 'admin')
    const adminUsers = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
    for (const adminUser of adminUsers) {
      const adminAssociates = await base44.asServiceRole.entities.Associate.filter({ user_id: adminUser.id });
      if (adminAssociates.length > 0) {
        await base44.asServiceRole.entities.Notification.create({
          associate_id: adminAssociates[0].id,
          title: 'Compra Pendente de Confirmação',
          message: `${click.associate_name || 'Associado'} enviou comprovante de compra de R$ ${Number(purchase_amount).toFixed(2)}`,
          type: 'order',
          link: '/admin/external-links'
        });
      }
    }

    return Response.json({ success: true, commission_amount });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});