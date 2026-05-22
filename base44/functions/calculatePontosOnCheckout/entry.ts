import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { associate_id, total_amount } = await req.json();

    if (!associate_id || total_amount == null) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get network config to get pontos_por_real
    const configs = await base44.asServiceRole.entities.NetworkConfig.list();
    const config = configs[0];
    const pontosPerReal = config?.pontos_por_real || 1;

    // Calculate pontos
    const pontos = Math.floor(total_amount * pontosPerReal);

    // Get associate and update total_pontos
    const associate = await base44.asServiceRole.entities.Associate.filter({ id: associate_id });
    if (!associate || associate.length === 0) {
      return Response.json({ error: 'Associate not found' }, { status: 404 });
    }

    const currentPontos = associate[0].total_pontos || 0;
    await base44.asServiceRole.entities.Associate.update(associate_id, {
      total_pontos: currentPontos + pontos
    });

    return Response.json({ success: true, pontos, total_pontos: currentPontos + pontos });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});