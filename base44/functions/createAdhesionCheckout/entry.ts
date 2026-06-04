import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

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
      redirect_url: `${req.headers.get('origin') || 'https://app.boldlife.com.br'}/?adhesion_paid=true`,
    };

    if (full_name || email || phone) {
      payload.customer = {
        name: full_name,
        email: email,
        phone_number: phone?.replace(/\D/g, ''),
      };
    }

    const res = await fetch('https://checkout.infinitepay.io/invoices/public/checkout/links', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('INFINITEPAY_API_KEY')}`
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      console.error('Invalid JSON response:', text.slice(0, 200));
      return Response.json({ error: 'Gateway de pagamento indisponível no momento' }, { status: 503 });
    }

    if (!res.ok) {
      console.error('InfinitePay Error:', data);
      return Response.json({ 
        error: 'Erro ao criar link de pagamento. Tente novamente em instantes.',
        details: data?.message || data?.error || 'Erro desconhecido'
      }, { status: res.status });
    }

    if (!data.url) {
      return Response.json({ error: 'Resposta inválida do gateway de pagamento' }, { status: 500 });
    }

    return Response.json({ url: data.url });
  } catch (error) {
    console.error('Checkout Error:', error);
    return Response.json({ error: 'Erro ao processar pagamento. Verifique sua conexão e tente novamente.' }, { status: 500 });
  }
});