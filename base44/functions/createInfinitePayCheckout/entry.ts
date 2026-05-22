import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { order_nsu, items, customer, address, redirect_url } = body;

    if (!order_nsu || !items || items.length === 0) {
      return Response.json({ error: 'order_nsu e items são obrigatórios' }, { status: 400 });
    }

    // Webhook URL: URL pública da função infinitePayWebhook na base44
    // O APP_ID é injetado automaticamente pelo ambiente
    const appId = Deno.env.get('BASE44_APP_ID') || '';
    const webhookUrl = `https://app-functions.base44.com/api/apps/${appId}/functions/infinitePayWebhook`;

    const payload = {
      handle: 'boldlife',
      order_nsu: String(order_nsu),
      items: items.map(item => ({
        description: item.description,
        price: Math.round(item.price * 100), // converter para centavos
        quantity: item.quantity || 1,
      })),
      webhook_url: webhookUrl,
    };

    if (redirect_url) payload.redirect_url = redirect_url;
    if (customer) payload.customer = customer;
    if (address) payload.address = address;

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