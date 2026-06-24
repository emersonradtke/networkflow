Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { amount, order_nsu, customer_name, customer_email, items, address } = body;

    if (!items || items.length === 0) {
      return Response.json({ error: 'items são obrigatórios' }, { status: 400 });
    }

    const apiKey = Deno.env.get('INFINITEPAY_API_KEY');
    const handle = Deno.env.get('INFINITEPAY_HANDLE') || 'boldlife';

    if (!apiKey) {
      return Response.json({ error: 'Gateway de pagamento não configurado' }, { status: 500 });
    }

    const payload = {
      handle,
      order_nsu: order_nsu ? String(order_nsu) : undefined,
      items: items.map(i => ({
        quantity: i.quantity,
        price: i.price, // em centavos
        description: i.description,
      })),
    };

    if (customer_name || customer_email) {
      payload.customer = {
        name: customer_name || '',
        email: customer_email || '',
      };
    }

    if (address && address.cep) {
      payload.address = {
        cep: (address.cep || '').replace(/\D/g, ''),
        street: address.street || '',
        neighborhood: address.neighborhood || '',
        number: address.number || '',
        complement: address.complement || '',
      };
    }

    console.log('[InfinitePay] Sending payload:', JSON.stringify(payload));

    const response = await fetch('https://api.checkout.infinitepay.io/links', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[InfinitePay] Error response:', JSON.stringify(data));
      return Response.json({ error: data.message || data.error || JSON.stringify(data) }, { status: response.status });
    }

    console.log('[InfinitePay] Success response:', JSON.stringify(data));
    const checkout_url = data.checkout_url || data.url || data.link || data.payment_link || data.payment_url;
    return Response.json({ success: true, checkout_url, checkout_id: data.id || data.slug });
  } catch (error) {
    console.error('[InfinitePay] Exception:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});