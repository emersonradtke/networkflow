import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return Response.json({ error: 'Usuário e senha são obrigatórios' }, { status: 400 });
    }

    // Usa o SDK do Base44 para autenticar
    // Note: O Base44 usa um sistema de autenticação baseado em tokens
    // Esta função tenta validar as credenciais via API interna
    const response = await fetch('https://api.base44.com/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('BASE44_SERVICE_TOKEN') || ''}`
      },
      body: JSON.stringify({ username, password })
    });

    if (!response.ok) {
      return Response.json({ error: 'Usuário ou senha inválidos' }, { status: 401 });
    }

    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});