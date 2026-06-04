import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const orphanedIssues = {
      by_table: {},
      summary: {
        total_orphaned: 0,
        tables_affected: 0,
        critical_issues: 0
      }
    };

    // Carregar todas as entidades referência
    const associates = await base44.asServiceRole.entities.Associate.list();
    const products = await base44.asServiceRole.entities.Product.list();
    const users = await base44.asServiceRole.entities.User.list();
    const shippingMethods = await base44.asServiceRole.entities.ShippingMethod.list();
    const suppliers = await base44.asServiceRole.entities.Supplier.list();

    const validAssociateIds = new Set(associates.map(a => a.id));
    const validProductIds = new Set(products.map(p => p.id));
    const validUserIds = new Set(users.map(u => u.id));
    const validShippingMethodIds = new Set(shippingMethods.map(s => s.id));
    const validSupplierIds = new Set(suppliers.map(s => s.id));

    // 1. ORDERS → Associate + Product + ShippingMethod
    const orders = await base44.asServiceRole.entities.Order.list();
    const orphanedOrdersByAssociate = orders.filter(o => !validAssociateIds.has(o.associate_id));
    const orphanedOrdersByProduct = orders.filter(o => o.product_id && !validProductIds.has(o.product_id));
    const orphanedOrdersByShipping = orders.filter(o => o.shipping_method_id && !validShippingMethodIds.has(o.shipping_method_id));

    if (orphanedOrdersByAssociate.length > 0 || orphanedOrdersByProduct.length > 0 || orphanedOrdersByShipping.length > 0) {
      orphanedIssues.by_table.Order = {
        severity: 'CRITICAL',
        total: orphanedOrdersByAssociate.length + orphanedOrdersByProduct.length + orphanedOrdersByShipping.length,
        issues: [
          orphanedOrdersByAssociate.length > 0 && `${orphanedOrdersByAssociate.length} orders sem associate válido`,
          orphanedOrdersByProduct.length > 0 && `${orphanedOrdersByProduct.length} orders sem product válido`,
          orphanedOrdersByShipping.length > 0 && `${orphanedOrdersByShipping.length} orders sem shipping_method válido`
        ].filter(Boolean),
        required_foreign_keys: ['associate_id FK→Associate', 'product_id FK→Product', 'shipping_method_id FK→ShippingMethod'],
        constraint_recommendation: 'ON DELETE RESTRICT (prevenir deletar associate/product se houver orders)'
      };
      orphanedIssues.summary.critical_issues++;
    }

    // 2. COMMISSIONS → Associate (beneficiary/originator) + Order
    const commissions = await base44.asServiceRole.entities.Commission.list();
    const orphanedCommByBeneficiary = commissions.filter(c => !validAssociateIds.has(c.beneficiary_id));
    const orphanedCommByOriginator = commissions.filter(c => c.originator_id && !validAssociateIds.has(c.originator_id));
    const orphanedCommByOrder = commissions.filter(c => !orders.find(o => o.id === c.order_id));

    if (orphanedCommByBeneficiary.length > 0 || orphanedCommByOriginator.length > 0 || orphanedCommByOrder.length > 0) {
      orphanedIssues.by_table.Commission = {
        severity: 'CRITICAL',
        total: orphanedCommByBeneficiary.length + orphanedCommByOriginator.length + orphanedCommByOrder.length,
        issues: [
          orphanedCommByBeneficiary.length > 0 && `${orphanedCommByBeneficiary.length} comissões sem beneficiary válido`,
          orphanedCommByOriginator.length > 0 && `${orphanedCommByOriginator.length} comissões sem originator válido`,
          orphanedCommByOrder.length > 0 && `${orphanedCommByOrder.length} comissões sem order válido`
        ].filter(Boolean),
        required_foreign_keys: ['beneficiary_id FK→Associate', 'originator_id FK→Associate', 'order_id FK→Order'],
        constraint_recommendation: 'ON DELETE CASCADE (deletar comissões ao deletar order/associate)'
      };
      orphanedIssues.summary.critical_issues++;
    }

    // 3. REVIEWS → Associate + Order + Product
    const reviews = await base44.asServiceRole.entities.Review.list();
    const orphanedReviewsByAssociate = reviews.filter(r => !validAssociateIds.has(r.associate_id));
    const orphanedReviewsByOrder = reviews.filter(r => !orders.find(o => o.id === r.order_id));
    const orphanedReviewsByProduct = reviews.filter(r => !validProductIds.has(r.product_id));

    if (orphanedReviewsByAssociate.length > 0 || orphanedReviewsByOrder.length > 0 || orphanedReviewsByProduct.length > 0) {
      orphanedIssues.by_table.Review = {
        severity: 'MEDIUM',
        total: orphanedReviewsByAssociate.length + orphanedReviewsByOrder.length + orphanedReviewsByProduct.length,
        issues: [
          orphanedReviewsByAssociate.length > 0 && `${orphanedReviewsByAssociate.length} reviews sem associate`,
          orphanedReviewsByOrder.length > 0 && `${orphanedReviewsByOrder.length} reviews sem order`,
          orphanedReviewsByProduct.length > 0 && `${orphanedReviewsByProduct.length} reviews sem product`
        ].filter(Boolean),
        required_foreign_keys: ['associate_id FK→Associate', 'order_id FK→Order', 'product_id FK→Product'],
        constraint_recommendation: 'ON DELETE CASCADE'
      };
    }

    // 4. ASSOCIATE → User (user_id) + Associate (sponsor_id)
    const orphanedAssocByUser = associates.filter(a => a.user_id && !validUserIds.has(a.user_id));
    const orphanedAssocBySponsor = associates.filter(a => a.sponsor_id && !validAssociateIds.has(a.sponsor_id));

    if (orphanedAssocByUser.length > 0 || orphanedAssocBySponsor.length > 0) {
      orphanedIssues.by_table.Associate = {
        severity: 'CRITICAL',
        total: orphanedAssocByUser.length + orphanedAssocBySponsor.length,
        issues: [
          orphanedAssocByUser.length > 0 && `${orphanedAssocByUser.length} associates sem user válido`,
          orphanedAssocBySponsor.length > 0 && `${orphanedAssocBySponsor.length} associates com sponsor inválido`
        ].filter(Boolean),
        required_foreign_keys: ['user_id FK→User', 'sponsor_id FK→Associate(self)'],
        constraint_recommendation: 'ON DELETE SET NULL (sponsor), ON DELETE RESTRICT (user)'
      };
      orphanedIssues.summary.critical_issues++;
    }

    // 5. WITHDRAWAL_REQUESTS → Associate
    const withdrawals = await base44.asServiceRole.entities.WithdrawalRequest.list();
    const orphanedWithdrawals = withdrawals.filter(w => !validAssociateIds.has(w.associate_id));

    if (orphanedWithdrawals.length > 0) {
      orphanedIssues.by_table.WithdrawalRequest = {
        severity: 'HIGH',
        total: orphanedWithdrawals.length,
        issues: [`${orphanedWithdrawals.length} withdrawal requests sem associate válido`],
        required_foreign_keys: ['associate_id FK→Associate'],
        constraint_recommendation: 'ON DELETE CASCADE'
      };
    }

    // 6. SUPPORT_TICKETS → Associate + Order
    const tickets = await base44.asServiceRole.entities.SupportTicket.list();
    const orphanedTicketsByAssoc = tickets.filter(t => !validAssociateIds.has(t.associate_id));
    const orphanedTicketsByOrder = tickets.filter(t => !orders.find(o => o.id === t.order_id));

    if (orphanedTicketsByAssoc.length > 0 || orphanedTicketsByOrder.length > 0) {
      orphanedIssues.by_table.SupportTicket = {
        severity: 'MEDIUM',
        total: orphanedTicketsByAssoc.length + orphanedTicketsByOrder.length,
        issues: [
          orphanedTicketsByAssoc.length > 0 && `${orphanedTicketsByAssoc.length} tickets sem associate`,
          orphanedTicketsByOrder.length > 0 && `${orphanedTicketsByOrder.length} tickets sem order`
        ].filter(Boolean),
        required_foreign_keys: ['associate_id FK→Associate', 'order_id FK→Order'],
        constraint_recommendation: 'ON DELETE CASCADE'
      };
    }

    // 7. NOTIFICATIONS → Associate
    const notifications = await base44.asServiceRole.entities.Notification.list();
    const orphanedNotifications = notifications.filter(n => !validAssociateIds.has(n.associate_id));

    if (orphanedNotifications.length > 0) {
      orphanedIssues.by_table.Notification = {
        severity: 'LOW',
        total: orphanedNotifications.length,
        issues: [`${orphanedNotifications.length} notificações sem associate válido`],
        required_foreign_keys: ['associate_id FK→Associate'],
        constraint_recommendation: 'ON DELETE CASCADE'
      };
    }

    // 8. EXTERNAL_LINK_CLICKS → Associate
    const externalLinks = await base44.asServiceRole.entities.ExternalLinkClick.list();
    const orphanedExternalLinks = externalLinks.filter(e => !validAssociateIds.has(e.associate_id));

    if (orphanedExternalLinks.length > 0) {
      orphanedIssues.by_table.ExternalLinkClick = {
        severity: 'MEDIUM',
        total: orphanedExternalLinks.length,
        issues: [`${orphanedExternalLinks.length} cliques sem associate válido`],
        required_foreign_keys: ['associate_id FK→Associate'],
        constraint_recommendation: 'ON DELETE CASCADE'
      };
    }

    // 9. CARD_REQUESTS → Associate
    const cardRequests = await base44.asServiceRole.entities.CardRequest.list();
    const orphanedCardRequests = cardRequests.filter(c => !validAssociateIds.has(c.associate_id));

    if (orphanedCardRequests.length > 0) {
      orphanedIssues.by_table.CardRequest = {
        severity: 'LOW',
        total: orphanedCardRequests.length,
        issues: [`${orphanedCardRequests.length} solicitações de cartão sem associate válido`],
        required_foreign_keys: ['associate_id FK→Associate'],
        constraint_recommendation: 'ON DELETE CASCADE'
      };
    }

    // 10. CARD_SPENDING_PROOFS → Associate
    const cardProofs = await base44.asServiceRole.entities.CardSpendingProof.list();
    const orphanedCardProofs = cardProofs.filter(c => !validAssociateIds.has(c.associate_id));

    if (orphanedCardProofs.length > 0) {
      orphanedIssues.by_table.CardSpendingProof = {
        severity: 'LOW',
        total: orphanedCardProofs.length,
        issues: [`${orphanedCardProofs.length} comprovantes sem associate válido`],
        required_foreign_keys: ['associate_id FK→Associate'],
        constraint_recommendation: 'ON DELETE CASCADE'
      };
    }

    // 11. ASSOCIATE_PLACEMENT → Associate (associate_id + target_sponsor_id)
    const placements = await base44.asServiceRole.entities.AssociatePlacement.list();
    const orphanedPlacementsByAssoc = placements.filter(p => !validAssociateIds.has(p.associate_id));
    const orphanedPlacementsByTarget = placements.filter(p => !validAssociateIds.has(p.target_sponsor_id));

    if (orphanedPlacementsByAssoc.length > 0 || orphanedPlacementsByTarget.length > 0) {
      orphanedIssues.by_table.AssociatePlacement = {
        severity: 'MEDIUM',
        total: orphanedPlacementsByAssoc.length + orphanedPlacementsByTarget.length,
        issues: [
          orphanedPlacementsByAssoc.length > 0 && `${orphanedPlacementsByAssoc.length} placements sem associate`,
          orphanedPlacementsByTarget.length > 0 && `${orphanedPlacementsByTarget.length} placements sem target_sponsor`
        ].filter(Boolean),
        required_foreign_keys: ['associate_id FK→Associate', 'target_sponsor_id FK→Associate'],
        constraint_recommendation: 'ON DELETE CASCADE'
      };
    }

    // 12. PRODUCT → Supplier (opcional)
    const orphanedProductsBySupplier = products.filter(p => p.supplier && !validSupplierIds.has(p.supplier));

    if (orphanedProductsBySupplier.length > 0) {
      orphanedIssues.by_table.Product = {
        severity: 'LOW',
        total: orphanedProductsBySupplier.length,
        issues: [`${orphanedProductsBySupplier.length} produtos com supplier inválido`],
        required_foreign_keys: ['supplier FK→Supplier (opcional)'],
        constraint_recommendation: 'ON DELETE SET NULL'
      };
    }

    // Calcular totais
    for (const table of Object.keys(orphanedIssues.by_table)) {
      orphanedIssues.summary.total_orphaned += orphanedIssues.by_table[table].total;
    }
    orphanedIssues.summary.tables_affected = Object.keys(orphanedIssues.by_table).length;

    return Response.json({
      success: true,
      audit_date: new Date().toISOString(),
      orphaned_issues: orphanedIssues,
      foreign_key_strategy: {
        description: 'Estratégia de integridade referencial recomendada',
        critical_constraints: [
          'Order.associate_id → Associate(id) [ON DELETE RESTRICT]',
          'Order.product_id → Product(id) [ON DELETE RESTRICT]',
          'Commission.beneficiary_id → Associate(id) [ON DELETE CASCADE]',
          'Commission.order_id → Order(id) [ON DELETE CASCADE]',
          'Associate.user_id → User(id) [ON DELETE RESTRICT]',
          'Associate.sponsor_id → Associate(id) [ON DELETE SET NULL]'
        ],
        cleanup_strategy: 'Usar cleanupOrphanedData antes de implementar constraints'
      }
    });
  } catch (error) {
    console.error('Erro na auditoria:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});