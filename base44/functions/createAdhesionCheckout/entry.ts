import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json();
    const { associate_id, amount, customer_name, customer_email, customer_document } = body;

    if (!associate_id || !amount) {
      return Response.json({ error: 'associate_id e amount são obrigatórios' }, { status: 400 });
    }

    const apiKey = Deno.env.get('INFINITEPAY_API_KEY');
    const handle = Deno.env.get('INFINITEPAY_HANDLE') || 'boldlife';

    if (!apiKey) {
      return Response.json({ error: 'Gateway de pagamento não configurado' }, { status: 500 });
    }

    const order_nsu = `ADES-${associate_id}`;

    const payload = {
      handle,
      amount: Math.round(amount * 100),
      order_nsu,
      description: 'Taxa de Adesão BoldLife',
      customer: {
        name: customer_name || '',
        email: customer_email || '',
        document: customer_document || '',
      },
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
      return Response.json({ error: data.message || 'Erro ao criar checkout de adesão' }, { status: response.status });
    }

    return Response.json({ success: true, checkout_url: data.checkout_url, order_nsu });
  } catch (error) {
    return Response.json({ error: 'Erro interno ao criar checkout de adesão' }, { status: 500 });
  }
});