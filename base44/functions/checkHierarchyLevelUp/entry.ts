import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const LEVELS = [
  { key: 'lider', name: 'Líder', minNetwork: 5 },
  { key: 'supervisor', name: 'Supervisor', minNetwork: 30 },
  { key: 'coordenador', name: 'Coordenador', minNetwork: 155 },
  { key: 'gerente', name: 'Gerente', minNetwork: 780 },
  { key: 'diretor', name: 'Diretor', minNetwork: 3905 },
];

function getCurrentLevel(networkCount) {
  let level = null;
  for (const l of LEVELS) {
    if (networkCount >= l.minNetwork) level = l;
  }
  return level;
}

async function countNetwork(base44, sponsorId) {
  let count = 0;
  let queue = [sponsorId];
  const visited = new Set();

  while (queue.length > 0) {
    const batch = queue.splice(0, 10);
    const results = await Promise.all(
      batch.map(id => base44.asServiceRole.entities.Associate.filter({ sponsor_id: id }))
    );
    for (const members of results) {
      for (const m of members) {
        if (!visited.has(m.id)) {
          visited.add(m.id);
          count++;
          queue.push(m.id);
        }
      }
    }
  }

  return count;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { associate_id } = body;

    if (!associate_id) {
      return Response.json({ error: 'associate_id required' }, { status: 400 });
    }

    const associates = await base44.asServiceRole.entities.Associate.filter({ id: associate_id });
    if (associates.length === 0) {
      return Response.json({ error: 'Associate not found' }, { status: 404 });
    }

    const associate = associates[0];
    const networkCount = await countNetwork(base44, associate_id);
    const newLevel = getCurrentLevel(networkCount);
    const oldLevelKey = associate.hierarchy_level || null;

    // Sem mudança
    if (!newLevel || newLevel.key === oldLevelKey) {
      return Response.json({ changed: false, level: newLevel?.key || null, network_count: networkCount });
    }

    // Subiu de nível — atualiza e notifica
    await base44.asServiceRole.entities.Associate.update(associate_id, {
      hierarchy_level: newLevel.key,
    });

    const emoji = newLevel.key === 'lider' ? '⭐' 
      : newLevel.key === 'supervisor' ? '🛡️'
      : newLevel.key === 'coordenador' ? '⚡'
      : newLevel.key === 'gerente' ? '🏆'
      : '👑';

    await base44.asServiceRole.entities.Notification.create({
      associate_id: associate_id,
      title: `${emoji} Você subiu para ${newLevel.name}!`,
      message: `Parabéns, ${associate.full_name?.split(' ')[0]}! Você atingiu a classificação de ${newLevel.name} com ${networkCount} pessoas na sua rede. Continue crescendo!`,
      type: 'system',
      is_read: false,
    });

    return Response.json({ changed: true, level: newLevel.key, network_count: networkCount });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});