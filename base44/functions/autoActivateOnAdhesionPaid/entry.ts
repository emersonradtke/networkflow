import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Disparado pela automação entity quando adhesion_paid muda para true
// Ativa automaticamente o associado
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event, data } = body;

    const associateId = event?.entity_id;
    if (!associateId) {
      return Response.json({ ok: true, skipped: 'no entity_id' });
    }

    // Buscar associado atualizado
    const associates = await base44.asServiceRole.entities.Associate.filter({ id: associateId });
    if (associates.length === 0) {
      return Response.json({ ok: true, skipped: 'associate not found' });
    }

    const associate = associates[0];

    // Só processar se adhesion_paid = true e status ainda é pending
    if (!associate.adhesion_paid || associate.status !== 'pending') {
      return Response.json({ ok: true, skipped: `adhesion_paid=${associate.adhesion_paid} status=${associate.status}` });
    }

    // Verificar limite de membros do patrocinador
    if (associate.sponsor_id) {
      const [configs, sponsorDownline] = await Promise.all([
        base44.asServiceRole.entities.NetworkConfig.list(),
        base44.asServiceRole.entities.Associate.filter({ sponsor_id: associate.sponsor_id }),
      ]);
      const maxLevels = configs[0]?.max_levels || 5;
      if (sponsorDownline.length >= maxLevels) {
        await base44.asServiceRole.entities.Associate.update(associateId, { status: 'awaiting_placement' });
        await base44.asServiceRole.entities.Notification.create({
          associate_id: associateId,
          title: 'Aguardando Colocação na Rede',
          message: `Seu patrocinador ${associate.sponsor_name || ''} já atingiu o limite de membros diretos. O administrador irá alocar você em breve.`,
          type: 'system',
          is_read: false,
        });
        console.log(`Associate ${associateId} colocado em awaiting_placement (sponsor cheio)`);
        return Response.json({ ok: true, status: 'awaiting_placement' });
      }
    }

    // Ativar associado
    await base44.asServiceRole.entities.Associate.update(associateId, { status: 'active' });
    await base44.asServiceRole.entities.Notification.create({
      associate_id: associateId,
      title: 'Conta Ativada! 🎉',
      message: 'Seu pagamento foi confirmado e sua conta está ativa. Bem-vindo à Bold Life!',
      type: 'activation',
      is_read: false,
    });

    console.log(`Associate ${associateId} ativado automaticamente após adhesion_paid=true`);
    return Response.json({ ok: true, status: 'active' });
  } catch (error) {
    console.error('Erro na ativação automática:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});