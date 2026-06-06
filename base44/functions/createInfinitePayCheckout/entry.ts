import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { order_nsu, items, customer, address, redirect_url } = body;

    if (!order_nsu || !items || items.length === 0) {
      return Response.json({ error: 'order_nsu e items são obrigatórios' }, { status: 400 });
    }

    // Webhook URL: será chamado pela InfinitePay quando pagamento for aprovado
    // Usar a URL relativa sem webhook_url - InfinitePay retorna apenas para a redirect_url
    // A confirmação virá via subscription do banco de dados (real-time)

    const payload = {
      handle: 'boldlife',
      order_nsu: String(order_nsu),
      items: items.map(item => ({
        description: item.description,
        price: Math.round(item.price * 100), // converter para centavos
        quantity: item.quantity || 1,
      })),
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