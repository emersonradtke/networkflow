import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Quando um novo associado é criado (ou ativado), verifica o nível hierárquico
// de todos os seus patrocinadores na cadeia
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event, data } = body;

    // Só processa criação ou quando status muda para active
    const associate = data;
    if (!associate) return Response.json({ ok: true });

    // Sobe pela cadeia de sponsors e verifica cada um
    let currentSponsorId = associate.sponsor_id;
    const visited = new Set();

    while (currentSponsorId && !visited.has(currentSponsorId)) {
      visited.add(currentSponsorId);

      // Chama a função de verificação de nível para o sponsor
      await base44.asServiceRole.functions.invoke('checkHierarchyLevelUp', {
        associate_id: currentSponsorId,
      });

      // Sobe para o próximo sponsor
      const sponsors = await base44.asServiceRole.entities.Associate.filter({ id: currentSponsorId });
      if (sponsors.length === 0) break;
      currentSponsorId = sponsors[0].sponsor_id || null;
    }

    return Response.json({ ok: true, sponsors_checked: visited.size });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});