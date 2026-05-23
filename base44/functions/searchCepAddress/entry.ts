Deno.serve(async (req) => {
  try {
    const { cep } = await req.json();

    if (!cep) {
      return Response.json({ error: 'CEP é obrigatório' }, { status: 400 });
    }

    const cleanCep = cep.replace(/\D/g, '');

    if (cleanCep.length !== 8) {
      return Response.json({ error: 'CEP deve ter 8 dígitos' }, { status: 400 });
    }

    // Usar ViaCEP para buscar endereço
    const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
    const data = await response.json();

    if (data.erro) {
      return Response.json({ error: 'CEP não encontrado' }, { status: 404 });
    }

    // Retornar dados formatados
    return Response.json({
      success: true,
      address: data.logradouro || '',
      neighborhood: data.bairro || '',
      city: data.localidade || '',
      state: data.uf || '',
      zip: cleanCep
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});