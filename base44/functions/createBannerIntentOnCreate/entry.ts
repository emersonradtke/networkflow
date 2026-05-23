import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    if (event.type !== 'create') {
      return Response.json({ success: false });
    }

    const banner = data;

    // Cria um registro de intenção de compra para o banner
    await base44.asServiceRole.entities.ExternalLinkClick.create({
      banner_id: banner.id,
      banner_name: banner.title,
      link_type: 'banner',
      status: 'intent'
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});