import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const associateId = body.event.entity_id;

    // Deletar todos os pedidos do associado
    const orders = await base44.asServiceRole.entities.Order.filter({ associate_id: associateId });
    for (const order of orders) {
      await base44.asServiceRole.entities.Order.delete(order.id);
    }

    // Deletar todas as comissões onde ele é beneficiário
    const beneficiaryCommissions = await base44.asServiceRole.entities.Commission.filter({ beneficiary_id: associateId });
    for (const commission of beneficiaryCommissions) {
      await base44.asServiceRole.entities.Commission.delete(commission.id);
    }

    // Deletar todas as notificações do associado
    const notifications = await base44.asServiceRole.entities.Notification.filter({ associate_id: associateId });
    for (const notification of notifications) {
      await base44.asServiceRole.entities.Notification.delete(notification.id);
    }

    // Deletar pedidos de saque do associado
    const withdrawals = await base44.asServiceRole.entities.WithdrawalRequest.filter({ associate_id: associateId });
    for (const withdrawal of withdrawals) {
      await base44.asServiceRole.entities.WithdrawalRequest.delete(withdrawal.id);
    }

    // Deletar requisições de colocação onde ele é beneficiário
    const placements = await base44.asServiceRole.entities.PlacementRequest.filter({ associate_id: associateId });
    for (const placement of placements) {
      await base44.asServiceRole.entities.PlacementRequest.delete(placement.id);
    }

    return Response.json({ 
      success: true, 
      deleted_orders: orders.length,
      deleted_commissions: beneficiaryCommissions.length,
      deleted_notifications: notifications.length,
      deleted_withdrawals: withdrawals.length,
      deleted_placements: placements.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});