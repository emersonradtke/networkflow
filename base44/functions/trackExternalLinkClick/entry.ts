import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { product_id, product_name, banner_id, banner_name, link_type } = body;

    // Obter dados do associado
    const associate = await base44.entities.Associate.filter({ user_id: user.id }, '', 1);
    if (!associate || associate.length === 0) {
      return Response.json({ error: 'Associate not found' }, { status: 404 });
    }

    const associateData = associate[0];

    // Registrar clique como intenção de compra
    const click = await base44.entities.ExternalLinkClick.create({
      associate_id: associateData.id,
      associate_name: associateData.full_name,
      product_id: product_id || null,
      product_name: product_name || null,
      banner_id: banner_id || null,
      banner_name: banner_name || null,
      link_type: link_type,
      status: 'intent',
      clicked_at: new Date().toISOString()
    });

    return Response.json({ success: true, click_id: click.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});