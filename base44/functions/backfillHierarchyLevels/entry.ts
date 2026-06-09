import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const LEVELS = [
  { key: 'lider',       minNetwork: 0 },
  { key: 'supervisor',  minNetwork: 30 },
  { key: 'coordenador', minNetwork: 155 },
  { key: 'gerente',     minNetwork: 780 },
  { key: 'diretor',     minNetwork: 3905 },
];

function getLevel(networkCount) {
  let level = LEVELS[0]; // default: lider (inclui zero)
  for (const l of LEVELS) {
    if (networkCount >= l.minNetwork) level = l;
  }
  return level;
}

async function countNetwork(base44, sponsorId, allAssociates) {
  // Usa lista em memória para evitar rate limit
  let count = 0;
  let queue = [sponsorId];
  const visited = new Set();

  while (queue.length > 0) {
    const current = queue.shift();
    const children = allAssociates.filter(a => a.sponsor_id === current);
    for (const child of children) {
      if (!visited.has(child.id)) {
        visited.add(child.id);
        count++;
        queue.push(child.id);
      }
    }
  }

  return count;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Busca todos os associados ativos de uma vez
    const allAssociates = await base44.asServiceRole.entities.Associate.list();

    let updated = 0;
    let skipped = 0;

    for (const associate of allAssociates) {
      const networkCount = await countNetwork(base44, associate.id, allAssociates);
      const level = getLevel(networkCount);

      if (associate.hierarchy_level !== level.key) {
        await base44.asServiceRole.entities.Associate.update(associate.id, {
          hierarchy_level: level.key,
        });
        updated++;
      } else {
        skipped++;
      }
    }

    return Response.json({
      ok: true,
      total: allAssociates.length,
      updated,
      skipped,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});