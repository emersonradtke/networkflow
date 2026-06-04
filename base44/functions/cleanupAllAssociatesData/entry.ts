import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado — apenas admin' }, { status: 403 });
    }

    const summary = {
      associates_deleted: 0,
      orders_deleted: 0,
      commissions_deleted: 0,
      withdrawals_deleted: 0,
      support_tickets_deleted: 0,
      reviews_deleted: 0,
      card_requests_deleted: 0,
      notifications_deleted: 0,
      external_links_deleted: 0,
      card_spending_proofs_deleted: 0,
      placement_requests_deleted: 0,
      pending_setups_deleted: 0
    };

    // 1. Fetch all associates
    const associates = await base44.asServiceRole.entities.Associate.list();
    const associateIds = associates.map(a => a.id);

    // 2. Delete dependent entities (in order of dependencies)
    if (associateIds.length > 0) {
      // Delete Orders
      const orders = await base44.asServiceRole.entities.Order.filter({ associate_id: { $in: associateIds } });
      for (const order of orders) {
        await base44.asServiceRole.entities.Order.delete(order.id);
      }
      summary.orders_deleted = orders.length;

      // Delete Commissions
      const commissions = await base44.asServiceRole.entities.Commission.list();
      const relatedCommissions = commissions.filter(c => associateIds.includes(c.beneficiary_id) || associateIds.includes(c.originator_id));
      for (const commission of relatedCommissions) {
        await base44.asServiceRole.entities.Commission.delete(commission.id);
      }
      summary.commissions_deleted = relatedCommissions.length;

      // Delete WithdrawalRequests
      const withdrawals = await base44.asServiceRole.entities.WithdrawalRequest.list();
      const relatedWithdrawals = withdrawals.filter(w => associateIds.includes(w.associate_id));
      for (const withdrawal of relatedWithdrawals) {
        await base44.asServiceRole.entities.WithdrawalRequest.delete(withdrawal.id);
      }
      summary.withdrawals_deleted = relatedWithdrawals.length;

      // Delete SupportTickets
      const tickets = await base44.asServiceRole.entities.SupportTicket.list();
      const relatedTickets = tickets.filter(t => associateIds.includes(t.associate_id));
      for (const ticket of relatedTickets) {
        await base44.asServiceRole.entities.SupportTicket.delete(ticket.id);
      }
      summary.support_tickets_deleted = relatedTickets.length;

      // Delete Reviews
      const reviews = await base44.asServiceRole.entities.Review.list();
      const relatedReviews = reviews.filter(r => associateIds.includes(r.associate_id));
      for (const review of relatedReviews) {
        await base44.asServiceRole.entities.Review.delete(review.id);
      }
      summary.reviews_deleted = relatedReviews.length;

      // Delete CardRequests
      const cardRequests = await base44.asServiceRole.entities.CardRequest.list();
      const relatedCardRequests = cardRequests.filter(c => associateIds.includes(c.associate_id));
      for (const cardRequest of relatedCardRequests) {
        await base44.asServiceRole.entities.CardRequest.delete(cardRequest.id);
      }
      summary.card_requests_deleted = relatedCardRequests.length;

      // Delete Notifications
      const notifications = await base44.asServiceRole.entities.Notification.list();
      const relatedNotifications = notifications.filter(n => associateIds.includes(n.associate_id));
      for (const notification of relatedNotifications) {
        await base44.asServiceRole.entities.Notification.delete(notification.id);
      }
      summary.notifications_deleted = relatedNotifications.length;

      // Delete ExternalLinkClicks
      const externalLinks = await base44.asServiceRole.entities.ExternalLinkClick.list();
      const relatedExternalLinks = externalLinks.filter(e => associateIds.includes(e.associate_id));
      for (const link of relatedExternalLinks) {
        await base44.asServiceRole.entities.ExternalLinkClick.delete(link.id);
      }
      summary.external_links_deleted = relatedExternalLinks.length;

      // Delete CardSpendingProofs
      const cardProofs = await base44.asServiceRole.entities.CardSpendingProof.list();
      const relatedCardProofs = cardProofs.filter(c => associateIds.includes(c.associate_id));
      for (const proof of relatedCardProofs) {
        await base44.asServiceRole.entities.CardSpendingProof.delete(proof.id);
      }
      summary.card_spending_proofs_deleted = relatedCardProofs.length;

      // Delete AssociatePlacements
      const placements = await base44.asServiceRole.entities.AssociatePlacement.list();
      const relatedPlacements = placements.filter(p => associateIds.includes(p.associate_id));
      for (const placement of relatedPlacements) {
        await base44.asServiceRole.entities.AssociatePlacement.delete(placement.id);
      }
      summary.placement_requests_deleted = relatedPlacements.length;

      // Delete PendingUserSetup related to these associates
      const pendingSetups = await base44.asServiceRole.entities.PendingUserSetup.list();
      const relatedPendingSetups = pendingSetups.filter(p => p.associate_id && associateIds.includes(p.associate_id));
      for (const pending of relatedPendingSetups) {
        await base44.asServiceRole.entities.PendingUserSetup.delete(pending.id);
      }
      summary.pending_setups_deleted = relatedPendingSetups.length;

      // 3. Finally, delete all Associates
      for (const associate of associates) {
        await base44.asServiceRole.entities.Associate.delete(associate.id);
      }
      summary.associates_deleted = associates.length;
    }

    return Response.json({
      success: true,
      message: `Limpeza concluída: ${associates.length} associados e todas suas movimentações foram removidos`,
      summary
    });
  } catch (error) {
    console.error('Erro ao limpar dados:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});