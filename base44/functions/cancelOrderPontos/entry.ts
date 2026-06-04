import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event, data } = body;

    // Só processa se o status foi mudado para "cancelled"
    if (data?.status !== 'cancelled') {
      return Response.json({ success: true, skipped: true });
    }

    const order = data;
    const associateId = order.associate_id;
    const amount = order.amount || 0;

    // Buscar config de pontos
    const config = await base44.asServiceRole.entities.NetworkConfig.list();
    const pontosPerReal = config[0]?.pontos_por_real || 1;
    const pontosCancelados = amount * pontosPerReal;

    // Atualizar Associate subtraindo os pontos
    if (associateId && pontosCancelados > 0) {
      try {
        const associate = await base44.asServiceRole.entities.Associate.get(associateId);
        if (associate) {
          const newPontos = Math.max(0, (associate.total_pontos || 0) - pontosCancelados);
          await base44.asServiceRole.entities.Associate.update(associateId, {
            total_pontos: newPontos
          });
        }
      } catch (e) {
        console.error(`Erro ao atualizar pontos do associado ${associateId}:`, e.message);
      }
    }

    return Response.json({ success: true, pontos_cancelados: pontosCancelados });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});