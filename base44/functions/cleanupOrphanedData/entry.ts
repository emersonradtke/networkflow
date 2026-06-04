import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const cleaned = {
      orphaned_orders: 0,
      orphaned_commissions: 0,
      orphaned_reviews: 0,
      orphaned_external_links: 0,
      orphaned_withdrawals: 0,
      orphaned_tickets: 0,
      orphaned_notifications: 0,
      orphaned_card_requests: 0,
      orphaned_card_proofs: 0,
      orphaned_placements: 0,
      total_cleaned: 0
    };

    // 1. Get all valid associate IDs
    const associates = await base44.asServiceRole.entities.Associate.list();
    const validAssociateIds = new Set(associates.map(a => a.id));

    // 2. Clean Orders referencing deleted associates
    const orders = await base44.asServiceRole.entities.Order.list();
    const orphanedOrders = orders.filter(o => !validAssociateIds.has(o.associate_id));
    for (const order of orphanedOrders) {
      await base44.asServiceRole.entities.Order.delete(order.id);
    }
    cleaned.orphaned_orders = orphanedOrders.length;

    // 3. Clean Commissions with deleted associates
    const commissions = await base44.asServiceRole.entities.Commission.list();
    const orphanedCommissions = commissions.filter(c => 
      !validAssociateIds.has(c.beneficiary_id) || (c.originator_id && !validAssociateIds.has(c.originator_id))
    );
    for (const commission of orphanedCommissions) {
      await base44.asServiceRole.entities.Commission.delete(commission.id);
    }
    cleaned.orphaned_commissions = orphanedCommissions.length;

    // 4. Clean Reviews
    const reviews = await base44.asServiceRole.entities.Review.list();
    const orphanedReviews = reviews.filter(r => !validAssociateIds.has(r.associate_id));
    for (const review of orphanedReviews) {
      await base44.asServiceRole.entities.Review.delete(review.id);
    }
    cleaned.orphaned_reviews = orphanedReviews.length;

    // 5. Clean ExternalLinkClicks
    const externalLinks = await base44.asServiceRole.entities.ExternalLinkClick.list();
    const orphanedLinks = externalLinks.filter(e => !validAssociateIds.has(e.associate_id));
    for (const link of orphanedLinks) {
      await base44.asServiceRole.entities.ExternalLinkClick.delete(link.id);
    }
    cleaned.orphaned_external_links = orphanedLinks.length;

    // 6. Clean WithdrawalRequests
    const withdrawals = await base44.asServiceRole.entities.WithdrawalRequest.list();
    const orphanedWithdrawals = withdrawals.filter(w => !validAssociateIds.has(w.associate_id));
    for (const withdrawal of orphanedWithdrawals) {
      await base44.asServiceRole.entities.WithdrawalRequest.delete(withdrawal.id);
    }
    cleaned.orphaned_withdrawals = orphanedWithdrawals.length;

    // 7. Clean SupportTickets
    const tickets = await base44.asServiceRole.entities.SupportTicket.list();
    const orphanedTickets = tickets.filter(t => !validAssociateIds.has(t.associate_id));
    for (const ticket of orphanedTickets) {
      await base44.asServiceRole.entities.SupportTicket.delete(ticket.id);
    }
    cleaned.orphaned_tickets = orphanedTickets.length;

    // 8. Clean Notifications
    const notifications = await base44.asServiceRole.entities.Notification.list();
    const orphanedNotifications = notifications.filter(n => !validAssociateIds.has(n.associate_id));
    for (const notification of orphanedNotifications) {
      await base44.asServiceRole.entities.Notification.delete(notification.id);
    }
    cleaned.orphaned_notifications = orphanedNotifications.length;

    // 9. Clean CardRequests
    const cardRequests = await base44.asServiceRole.entities.CardRequest.list();
    const orphanedCardRequests = cardRequests.filter(c => !validAssociateIds.has(c.associate_id));
    for (const cardRequest of orphanedCardRequests) {
      await base44.asServiceRole.entities.CardRequest.delete(cardRequest.id);
    }
    cleaned.orphaned_card_requests = orphanedCardRequests.length;

    // 10. Clean CardSpendingProofs
    const cardProofs = await base44.asServiceRole.entities.CardSpendingProof.list();
    const orphanedCardProofs = cardProofs.filter(c => !validAssociateIds.has(c.associate_id));
    for (const proof of orphanedCardProofs) {
      await base44.asServiceRole.entities.CardSpendingProof.delete(proof.id);
    }
    cleaned.orphaned_card_proofs = orphanedCardProofs.length;

    // 11. Clean AssociatePlacements
    const placements = await base44.asServiceRole.entities.AssociatePlacement.list();
    const orphanedPlacements = placements.filter(p => 
      !validAssociateIds.has(p.associate_id) || !validAssociateIds.has(p.target_sponsor_id)
    );
    for (const placement of orphanedPlacements) {
      await base44.asServiceRole.entities.AssociatePlacement.delete(placement.id);
    }
    cleaned.orphaned_placements = orphanedPlacements.length;

    cleaned.total_cleaned = Object.values(cleaned).reduce((a, b) => a + b, 0);

    return Response.json({
      success: true,
      message: `Limpeza concluída: ${cleaned.total_cleaned} registros órfãos removidos`,
      cleaned
    });
  } catch (error) {
    console.error('Erro ao limpar órfãos:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});