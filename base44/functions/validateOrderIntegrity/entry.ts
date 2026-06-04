import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { order_id, associate_id, product_id, shipping_method_id } = await req.json();

    // Validar que associate existe
    if (associate_id) {
      const associates = await base44.asServiceRole.entities.Associate.filter({ id: associate_id });
      if (associates.length === 0) {
        return Response.json({ error: 'Associate não existe', valid: false }, { status: 400 });
      }
    }

    // Validar que product existe
    if (product_id) {
      const products = await base44.asServiceRole.entities.Product.filter({ id: product_id });
      if (products.length === 0) {
        return Response.json({ error: 'Product não existe', valid: false }, { status: 400 });
      }
    }

    // Validar que shipping_method existe
    if (shipping_method_id) {
      const methods = await base44.asServiceRole.entities.ShippingMethod.filter({ id: shipping_method_id });
      if (methods.length === 0) {
        return Response.json({ error: 'ShippingMethod não existe', valid: false }, { status: 400 });
      }
    }

    return Response.json({ valid: true, message: 'Todas as referências são válidas' });
  } catch (error) {
    console.error('Erro na validação:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});