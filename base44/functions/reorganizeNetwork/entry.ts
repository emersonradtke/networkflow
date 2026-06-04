import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Recalcula level_in_network de um associado e toda sua descendência
async function recalcLevels(base44, associateId, newLevel) {
  await base44.asServiceRole.entities.Associate.update(associateId, { level_in_network: newLevel });
  const children = await base44.asServiceRole.entities.Associate.filter({ sponsor_id: associateId });
  for (const child of children) {
    await recalcLevels(base44, child.id, newLevel + 1);
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action } = body;

    // ── Reorganizar rede inteira (após mudança de max_levels) ──────────────
    if (action === 'recalc_all_levels') {
      // Buscar raízes (sem sponsor)
      const roots = await base44.asServiceRole.entities.Associate.filter({ sponsor_id: null });
      // Também raízes com sponsor_id vazio
      const rootsEmpty = await base44.asServiceRole.entities.Associate.filter({ sponsor_id: '' });
      const allRoots = [...roots, ...rootsEmpty];
      for (const root of allRoots) {
        await recalcLevels(base44, root.id, 1);
      }
      return Response.json({ success: true, message: `${allRoots.length} raiz(es) recalculadas.` });
    }

    // ── Trocar patrocinador de um associado ──────────────────────────────
    if (action === 'change_sponsor') {
      const { associate_id, new_sponsor_id } = body;
      if (!associate_id) return Response.json({ error: 'associate_id obrigatório' }, { status: 400 });

      let newLevel = 1;
      let newSponsorName = null;

      if (new_sponsor_id) {
        const sponsor = await base44.asServiceRole.entities.Associate.filter({ id: new_sponsor_id });
        if (!sponsor.length) return Response.json({ error: 'Novo patrocinador não encontrado' }, { status: 404 });
        newLevel = (sponsor[0].level_in_network || 1) + 1;
        newSponsorName = sponsor[0].full_name;
      }

      // Atualizar o associado
      await base44.asServiceRole.entities.Associate.update(associate_id, {
        sponsor_id: new_sponsor_id || null,
        sponsor_name: newSponsorName,
        level_in_network: newLevel,
      });

      // Recalcular a descendência
      const children = await base44.asServiceRole.entities.Associate.filter({ sponsor_id: associate_id });
      for (const child of children) {
        await recalcLevels(base44, child.id, newLevel + 1);
      }

      return Response.json({ success: true });
    }

    return Response.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (error) {
    console.error('reorganizeNetwork error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});