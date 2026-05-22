import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const { event, data } = body;
    const orderId = event.entity_id;

    // Deletar comissões associadas ao pedido
    const commissions = await base44.asServiceRole.entities.Commission.filter({ order_id: orderId });
    
    for (const commission of commissions) {
      await base44.asServiceRole.entities.Commission.delete(commission.id);
      
      // Atualizar wallet do beneficiário (subtrair comissão)
      if (commission.beneficiary_id) {
        const associate = await base44.asServiceRole.entities.Associate.get(commission.beneficiary_id);
        if (associate) {
          const newWallet = Math.max(0, (associate.wallet_balance || 0) - (commission.commission_amount || 0));
          await base44.asServiceRole.entities.Associate.update(commission.beneficiary_id, { 
            wallet_balance: newWallet,
            total_earned: Math.max(0, (associate.total_earned || 0) - (commission.commission_amount || 0))
          });
        }
      }
    }

    return Response.json({ success: true, deleted_commissions: commissions.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});