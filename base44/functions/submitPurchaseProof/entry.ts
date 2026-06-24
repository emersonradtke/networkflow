import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { click_id, purchase_proof_urls, purchase_amount } = body;

    if (!click_id || !purchase_amount) {
      return Response.json({ error: 'Dados obrigatórios ausentes' }, { status: 400 });
    }

    const proofUrls = purchase_proof_urls || [];
    if (proofUrls.length === 0) {
      return Response.json({ error: 'Pelo menos um comprovante é obrigatório' }, { status: 400 });
    }

    // Buscar o clique primeiro
    let click = null;
    try {
      const result = await base44.asServiceRole.entities.ExternalLinkClick.get(click_id);
      click = result;
    } catch (_) {
      // ignore not found
    }
    if (!click) {
      return Response.json({ error: 'Click not found' }, { status: 404 });
    }

    // Buscar associate do usuário logado — tenta por user_id e por email como fallback
    let associates = await base44.entities.Associate.filter({ user_id: user.id });
    if (!associates || associates.length === 0) {
      associates = await base44.asServiceRole.entities.Associate.filter({ email: user.email });
    }
    if (!associates || associates.length === 0) {
      return Response.json({ error: 'Associate not found' }, { status: 404 });
    }
    const associate = associates[0];

    // Verificar ownership
    if (click.associate_id !== associate.id) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Calcular comissão
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

    // Salvar primeiro URL como campo principal, e todos no campo de array
    await base44.asServiceRole.entities.ExternalLinkClick.update(click_id, {
      purchase_proof_url: proofUrls[0],
      purchase_proof_urls: proofUrls,
      purchase_amount,
      commission_amount,
      status: 'submitted'
    });

    // Notificar admins
    const adminUsers = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
    for (const adminUser of adminUsers) {
      const adminAssociates = await base44.asServiceRole.entities.Associate.filter({ user_id: adminUser.id });
      if (adminAssociates.length > 0) {
        await base44.asServiceRole.entities.Notification.create({
          associate_id: adminAssociates[0].id,
          title: 'Compra Pendente de Confirmação',
          message: `${associate.full_name || 'Associado'} enviou ${proofUrls.length} comprovante(s) de compra no valor de R$ ${Number(purchase_amount).toFixed(2)}`,
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