import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { amount, order_nsu, description, customer_name, customer_email, customer_document, items } = body;

    if (!amount || !order_nsu) {
      return Response.json({ error: 'amount e order_nsu são obrigatórios' }, { status: 400 });
    }

    const apiKey = Deno.env.get('INFINITEPAY_API_KEY');
    const handle = Deno.env.get('INFINITEPAY_HANDLE') || 'boldlife';

    if (!apiKey) {
      return Response.json({ error: 'Gateway de pagamento não configurado' }, { status: 500 });
    }

    const payload = {
      handle,
      amount: Math.round(amount * 100), // centavos
      order_nsu: String(order_nsu),
      description: description || 'Compra BoldLife',
      customer: {
        name: customer_name || '',
        email: customer_email || '',
        document: customer_document || '',
      },
      items: items || [],
    };

    const response = await fetch('https://api.infinitepay.io/invoices/public/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      return Response.json({ error: data.message || 'Erro ao criar checkout' }, { status: response.status });
    }

    return Response.json({ success: true, checkout_url: data.checkout_url, checkout_id: data.id });
  } catch (error) {
    return Response.json({ error: 'Erro interno ao criar checkout' }, { status: 500 });
  }
});