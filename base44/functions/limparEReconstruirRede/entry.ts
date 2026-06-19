import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'status';

    // Buscar todos
    const all = await base44.asServiceRole.entities.Associate.list('-created_date', 600);
    const ficticios = all.filter(a => a.email && a.email.includes('@boldlife.test'));

    if (action === 'delete_all') {
      let deleted = 0;
      for (const f of ficticios) {
        await base44.asServiceRole.entities.Associate.delete(f.id);
        deleted++;
        await new Promise(r => setTimeout(r, 150));
      }
      return Response.json({ ok: true, deleted });
    }

    // Mostrar status: quem tem mais de 5 diretos
    const directMap = {};
    for (const a of all) {
      if (a.sponsor_id) directMap[a.sponsor_id] = (directMap[a.sponsor_id] || 0) + 1;
    }
    const overLimit = [];
    for (const [id, count] of Object.entries(directMap)) {
      if (count > 5) {
        const m = all.find(a => a.id === id);
        overLimit.push({ id, name: m?.full_name, count });
      }
    }

    return Response.json({
      total: all.length,
      ficticios: ficticios.length,
      over_limit: overLimit,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});