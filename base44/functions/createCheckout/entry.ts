import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { order_nsu, items, customer, address, redirect_url } = body;

    if (!order_nsu || !items || items.length === 0) {
      return Response.json({ error: 'order_nsu e items são obrigatórios' }, { status: 400 });
    }

    // Buscar gateway configurado
    const configs = await base44.asServiceRole.entities.NetworkConfig.list();
    const gateway = configs[0]?.payment_gateway || 'infinitepay';

    if (gateway === 'infinitepay') {
      const payload = {
        handle: 'boldlife',
        order_nsu: String(order_nsu),
        items: items.map(item => ({
          description: item.description,
          price: Math.round(item.price * 100),
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
      if (!res.ok) return Response.json({ error: 'Erro InfinitePay', details: data }, { status: res.status });
      return Response.json({ url: data.url, gateway });
    }

    if (gateway === 'mercadopago') {
      const MP_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
      if (!MP_TOKEN) return Response.json({ error: 'MERCADOPAGO_ACCESS_TOKEN não configurado' }, { status: 500 });

      const totalAmount = items.reduce((s, i) => s + i.price * (i.quantity || 1), 0);
      const payload = {
        external_reference: String(order_nsu),
        items: items.map(item => ({
          title: item.description,
          unit_price: parseFloat(item.price.toFixed(2)),
          quantity: item.quantity || 1,
          currency_id: 'BRL',
        })),
        back_urls: {
          success: redirect_url || '',
          failure: redirect_url || '',
          pending: redirect_url || '',
        },
        auto_return: 'approved',
        payer: customer ? { name: customer.name, email: customer.email } : undefined,
      };

      const res = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${MP_TOKEN}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) return Response.json({ error: 'Erro Mercado Pago', details: data }, { status: res.status });
      return Response.json({ url: data.init_point, gateway });
    }

    if (gateway === 'cielo') {
      const CIELO_MERCHANT_ID = Deno.env.get('CIELO_MERCHANT_ID');
      const CIELO_MERCHANT_KEY = Deno.env.get('CIELO_MERCHANT_KEY');
      if (!CIELO_MERCHANT_ID || !CIELO_MERCHANT_KEY) {
        return Response.json({ error: 'CIELO_MERCHANT_ID e CIELO_MERCHANT_KEY não configurados' }, { status: 500 });
      }

      const totalCents = items.reduce((s, i) => s + Math.round(i.price * 100) * (i.quantity || 1), 0);
      const payload = {
        MerchantOrderId: String(order_nsu),
        Customer: customer ? { Name: customer.name, Email: customer.email } : { Name: 'Cliente' },
        Payment: {
          Type: 'Boleto',
          Amount: totalCents,
          Installments: 1,
          ReturnUrl: redirect_url || '',
        },
      };

      const res = await fetch('https://apisandbox.cieloecommerce.cielo.com.br/1/sales/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'MerchantId': CIELO_MERCHANT_ID,
          'MerchantKey': CIELO_MERCHANT_KEY,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) return Response.json({ error: 'Erro Cielo', details: data }, { status: res.status });
      const url = data.Payment?.Url || data.Payment?.BoletoUrl || '';
      return Response.json({ url, gateway });
    }

    if (gateway === 'pagarme') {
      const PAGARME_SECRET = Deno.env.get('PAGARME_SECRET_KEY');
      if (!PAGARME_SECRET) return Response.json({ error: 'PAGARME_SECRET_KEY não configurado' }, { status: 500 });

      const totalCents = items.reduce((s, i) => s + Math.round(i.price * 100) * (i.quantity || 1), 0);
      const payload = {
        amount: totalCents,
        payment_method: 'boleto',
        customer: customer ? {
          external_id: String(order_nsu),
          name: customer.name,
          email: customer.email,
          type: 'individual',
          country: 'br',
          phone_numbers: customer.phone_number ? [`+55${customer.phone_number.replace(/\D/g,'')}`] : ['+5500000000000'],
          documents: [{ type: 'cpf', number: '00000000000' }],
        } : undefined,
        items: items.map((item, idx) => ({
          id: String(idx + 1),
          title: item.description,
          unit_price: Math.round(item.price * 100),
          quantity: item.quantity || 1,
          tangible: true,
        })),
        postback_url: redirect_url || '',
      };

      const creds = btoa(`${PAGARME_SECRET}:`);
      const res = await fetch('https://api.pagar.me/1/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${creds}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) return Response.json({ error: 'Erro Pagar.me', details: data }, { status: res.status });
      const url = data.boleto_url || redirect_url || '';
      return Response.json({ url, gateway });
    }

    return Response.json({ error: `Gateway '${gateway}' não suportado` }, { status: 400 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});