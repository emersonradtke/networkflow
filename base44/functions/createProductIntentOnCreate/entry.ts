import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    if (event.type !== 'create') {
      return Response.json({ success: false });
    }

    const product = data;

    // Apenas cria intent para produtos com link externo
    if (product.type !== 'external_link') {
      return Response.json({ success: false });
    }

    // Cria um registro de intenção de compra para o produto
    await base44.asServiceRole.entities.ExternalLinkClick.create({
      product_id: product.id,
      product_name: product.name,
      link_type: 'product',
      status: 'intent'
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});