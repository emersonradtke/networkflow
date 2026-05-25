import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Endpoint público para criar checkout de adesão (não requer login)
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { associate_id, full_name, email, phone } = await req.json();

    if (!associate_id) {
      return Response.json({ error: 'associate_id é obrigatório' }, { status: 400 });
    }

    // Buscar o associado para validar que existe
    const associate = await base44.asServiceRole.entities.Associate.filter({ id: associate_id });
    if (!associate || associate.length === 0) {
      return Response.json({ error: 'Associado não encontrado' }, { status: 404 });
    }

    // Buscar configuração de adesão
    const configs = await base44.asServiceRole.entities.NetworkConfig.list();
    const config = configs[0];
    const adhesionPrice = config?.adhesion_price || 197;
    const adhesionDesc = config?.adhesion_description || 'Taxa de Adesão Bold Life';

    const payload = {
      handle: 'boldlife',
      order_nsu: `ADES-${associate_id}`,
      items: [{
        description: adhesionDesc.slice(0, 128),
        price: Math.round(adhesionPrice * 100),
        quantity: 1,
      }],
      redirect_url: `${req.headers.get('origin') || 'https://app.boldlife.com.br'}/dashboard`,
    };

    if (full_name || email || phone) {
      payload.customer = {
        name: full_name,
        email: email,
        phone_number: phone?.replace(/\D/g, ''),
      };
    }

    const res = await fetch('https://api.infinitepay.io/invoices/public/checkout/links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      return Response.json({ error: 'Erro ao criar link InfinitePay', details: data }, { status: res.status });
    }

    return Response.json({ url: data.url });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});