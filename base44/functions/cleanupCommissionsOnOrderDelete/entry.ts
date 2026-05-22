import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const { event, data } = body;
    const orderId = event.entity_id;

    // Buscar comissões associadas ao pedido
    const commissions = await base44.asServiceRole.entities.Commission.filter({ order_id: orderId });
    
    // Deletar comissões e ajustar dados dos associados
    for (const commission of commissions) {
      await base44.asServiceRole.entities.Commission.delete(commission.id);
      
      if (commission.beneficiary_id) {
        const associate = await base44.asServiceRole.entities.Associate.get(commission.beneficiary_id);
        if (associate) {
          const newWallet = Math.max(0, (associate.wallet_balance || 0) - (commission.commission_amount || 0));
          const newEarned = Math.max(0, (associate.total_earned || 0) - (commission.commission_amount || 0));
          await base44.asServiceRole.entities.Associate.update(commission.beneficiary_id, { 
            wallet_balance: newWallet,
            total_earned: newEarned
          });
        }
      }
    }

    // Buscar pedido deletado para remover pontos do associado
    const config = await base44.asServiceRole.entities.NetworkConfig.list();
    const pontosPerReal = config[0]?.pontos_por_real || 1;
    
    if (data?.associate_id && data?.amount) {
      const pontos = data.amount * pontosPerReal;
      const associate = await base44.asServiceRole.entities.Associate.get(data.associate_id);
      if (associate && pontos > 0) {
        const newPontos = Math.max(0, (associate.total_pontos || 0) - pontos);
        await base44.asServiceRole.entities.Associate.update(data.associate_id, {
          total_pontos: newPontos
        });
      }
    }

    return Response.json({ success: true, deleted_commissions: commissions.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});