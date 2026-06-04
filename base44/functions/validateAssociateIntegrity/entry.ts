import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { user_id, sponsor_id } = await req.json();

    // Validar que user existe
    if (user_id) {
      const users = await base44.asServiceRole.entities.User.filter({ id: user_id });
      if (users.length === 0) {
        return Response.json({ error: 'User não existe', valid: false }, { status: 400 });
      }
    }

    // Validar que sponsor existe e não cria ciclo
    if (sponsor_id) {
      const sponsors = await base44.asServiceRole.entities.Associate.filter({ id: sponsor_id });
      if (sponsors.length === 0) {
        return Response.json({ error: 'Sponsor não existe', valid: false }, { status: 400 });
      }

      // Verificar auto-referência
      if (sponsor_id === user_id) {
        return Response.json({ error: 'Associate não pode ser seu próprio sponsor', valid: false }, { status: 400 });
      }
    }

    return Response.json({ valid: true, message: 'Associate integridade OK' });
  } catch (error) {
    console.error('Erro na validação:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});