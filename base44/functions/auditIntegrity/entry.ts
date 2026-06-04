import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const issues = [];
    const stats = {
      total_associates: 0,
      total_users: 0,
      total_orders: 0,
      total_commissions: 0,
      total_products: 0,
      orphaned_records: 0,
      broken_relationships: 0,
      calculation_errors: 0
    };

    // 1. Fetch all entities
    const associates = await base44.asServiceRole.entities.Associate.list();
    const orders = await base44.asServiceRole.entities.Order.list();
    const commissions = await base44.asServiceRole.entities.Commission.list();
    const products = await base44.asServiceRole.entities.Product.list();
    const reviews = await base44.asServiceRole.entities.Review.list();
    const externalLinks = await base44.asServiceRole.entities.ExternalLinkClick.list();
    const withdrawals = await base44.asServiceRole.entities.WithdrawalRequest.list();
    const tickets = await base44.asServiceRole.entities.SupportTicket.list();
    const placements = await base44.asServiceRole.entities.AssociatePlacement.list();

    stats.total_associates = associates.length;
    stats.total_orders = orders.length;
    stats.total_commissions = commissions.length;
    stats.total_products = products.length;

    const associateIds = new Set(associates.map(a => a.id));
    const productIds = new Set(products.map(p => p.id));

    // 2. Validate Associate → User relationship
    for (const assoc of associates) {
      if (assoc.user_id && assoc.user_id.trim()) {
        // Verificar se user_id existe (não há API direta, então apenas checamos se está definido)
        if (!assoc.user_id.match(/^[a-zA-Z0-9-]+$/)) {
          issues.push({
            severity: 'error',
            type: 'invalid_user_reference',
            associate_id: assoc.id,
            message: `Associate ${assoc.id} tem user_id inválido: ${assoc.user_id}`
          });
          stats.broken_relationships++;
        }
      }
    }

    // 3. Validate sponsor relationships (genealogy)
    for (const assoc of associates) {
      if (assoc.sponsor_id && assoc.sponsor_id.trim()) {
        if (!associateIds.has(assoc.sponsor_id)) {
          issues.push({
            severity: 'error',
            type: 'orphaned_sponsor',
            associate_id: assoc.id,
            message: `Associate ${assoc.id} referencia sponsor não-existente: ${assoc.sponsor_id}`
          });
          stats.orphaned_records++;
          stats.broken_relationships++;
        }
      }

      // Detectar ciclos (auto-referência)
      if (assoc.sponsor_id === assoc.id) {
        issues.push({
          severity: 'critical',
          type: 'cyclic_sponsor',
          associate_id: assoc.id,
          message: `Associate ${assoc.id} é seu próprio sponsor (ciclo)`
        });
        stats.broken_relationships++;
      }
    }

    // 4. Validate Orders → Associate relationship
    for (const order of orders) {
      if (!associateIds.has(order.associate_id)) {
        issues.push({
          severity: 'error',
          type: 'orphaned_order',
          order_id: order.id,
          associate_id: order.associate_id,
          message: `Order ${order.id} referencia associate não-existente: ${order.associate_id}`
        });
        stats.orphaned_records++;
        stats.broken_relationships++;
      }

      // Validar product_id
      if (order.product_id && !productIds.has(order.product_id)) {
        issues.push({
          severity: 'warning',
          type: 'orphaned_product_in_order',
          order_id: order.id,
          product_id: order.product_id,
          message: `Order ${order.id} referencia produto deletado: ${order.product_id}`
        });
        stats.orphaned_records++;
      }

      // Validar cálculo: amount deve ser quantity * unit_price
      const expectedAmount = (order.quantity || 1) * (order.unit_price || 0);
      if (Math.abs((order.amount || 0) - expectedAmount) > 0.01) {
        issues.push({
          severity: 'error',
          type: 'amount_calculation_error',
          order_id: order.id,
          expected: expectedAmount,
          actual: order.amount,
          message: `Order ${order.id}: amount ${order.amount} != quantity ${order.quantity} * unit_price ${order.unit_price} (esperado: ${expectedAmount})`
        });
        stats.calculation_errors++;
      }

      // Validar commission_percent vs product
      if (order.product_id && productIds.has(order.product_id)) {
        const product = products.find(p => p.id === order.product_id);
        if (product && product.commission_percent !== order.commission_percent) {
          issues.push({
            severity: 'warning',
            type: 'commission_percent_mismatch',
            order_id: order.id,
            product_percent: product.commission_percent,
            order_percent: order.commission_percent,
            message: `Order ${order.id}: commission_percent diverge do produto (produto: ${product.commission_percent}%, order: ${order.commission_percent}%)`
          });
        }
      }
    }

    // 5. Validate Commissions → Order, Associate relationships
    for (const commission of commissions) {
      // Check beneficiary
      if (!associateIds.has(commission.beneficiary_id)) {
        issues.push({
          severity: 'error',
          type: 'orphaned_commission_beneficiary',
          commission_id: commission.id,
          beneficiary_id: commission.beneficiary_id,
          message: `Commission ${commission.id} beneficiary não-existente: ${commission.beneficiary_id}`
        });
        stats.orphaned_records++;
        stats.broken_relationships++;
      }

      // Check originator
      if (commission.originator_id && !associateIds.has(commission.originator_id)) {
        issues.push({
          severity: 'error',
          type: 'orphaned_commission_originator',
          commission_id: commission.id,
          originator_id: commission.originator_id,
          message: `Commission ${commission.id} originator não-existente: ${commission.originator_id}`
        });
        stats.orphaned_records++;
        stats.broken_relationships++;
      }

      // Check order relationship
      const relatedOrder = orders.find(o => o.id === commission.order_id);
      if (!relatedOrder) {
        issues.push({
          severity: 'error',
          type: 'orphaned_commission_order',
          commission_id: commission.id,
          order_id: commission.order_id,
          message: `Commission ${commission.id} referencia order não-existente: ${commission.order_id}`
        });
        stats.orphaned_records++;
        stats.broken_relationships++;
      }

      // Validar cálculo de comissão: total_commission = order_amount * commission_percent / 100
      const expectedCommission = (commission.order_amount || 0) * ((commission.commission_percent || 0) / 100);
      if (Math.abs((commission.commission_amount || 0) - expectedCommission) > 0.01) {
        issues.push({
          severity: 'error',
          type: 'commission_amount_error',
          commission_id: commission.id,
          expected: expectedCommission,
          actual: commission.commission_amount,
          message: `Commission ${commission.id}: amount ${commission.commission_amount} != order_amount ${commission.order_amount} * percent ${commission.commission_percent}% (esperado: ${expectedCommission})`
        });
        stats.calculation_errors++;
      }
    }

    // 6. Validate Reviews → Order, Associate, Product
    for (const review of reviews) {
      if (!associateIds.has(review.associate_id)) {
        issues.push({
          severity: 'warning',
          type: 'orphaned_review_associate',
          review_id: review.id,
          associate_id: review.associate_id,
          message: `Review ${review.id} associate não-existente: ${review.associate_id}`
        });
        stats.orphaned_records++;
      }

      if (!orders.find(o => o.id === review.order_id)) {
        issues.push({
          severity: 'warning',
          type: 'orphaned_review_order',
          review_id: review.id,
          order_id: review.order_id,
          message: `Review ${review.id} order não-existente: ${review.order_id}`
        });
        stats.orphaned_records++;
      }

      if (review.product_id && !productIds.has(review.product_id)) {
        issues.push({
          severity: 'warning',
          type: 'orphaned_review_product',
          review_id: review.id,
          product_id: review.product_id,
          message: `Review ${review.id} product não-existente: ${review.product_id}`
        });
        stats.orphaned_records++;
      }
    }

    // 7. Validate ExternalLinkClicks → Associate
    for (const link of externalLinks) {
      if (!associateIds.has(link.associate_id)) {
        issues.push({
          severity: 'warning',
          type: 'orphaned_external_link',
          link_id: link.id,
          associate_id: link.associate_id,
          message: `ExternalLinkClick ${link.id} associate não-existente: ${link.associate_id}`
        });
        stats.orphaned_records++;
      }
    }

    // 8. Validate WithdrawalRequests → Associate
    for (const withdrawal of withdrawals) {
      if (!associateIds.has(withdrawal.associate_id)) {
        issues.push({
          severity: 'error',
          type: 'orphaned_withdrawal',
          withdrawal_id: withdrawal.id,
          associate_id: withdrawal.associate_id,
          message: `WithdrawalRequest ${withdrawal.id} associate não-existente: ${withdrawal.associate_id}`
        });
        stats.orphaned_records++;
        stats.broken_relationships++;
      }
    }

    // 9. Validate SupportTickets → Associate, Order
    for (const ticket of tickets) {
      if (!associateIds.has(ticket.associate_id)) {
        issues.push({
          severity: 'warning',
          type: 'orphaned_ticket_associate',
          ticket_id: ticket.id,
          associate_id: ticket.associate_id,
          message: `SupportTicket ${ticket.id} associate não-existente: ${ticket.associate_id}`
        });
        stats.orphaned_records++;
      }

      if (!orders.find(o => o.id === ticket.order_id)) {
        issues.push({
          severity: 'warning',
          type: 'orphaned_ticket_order',
          ticket_id: ticket.id,
          order_id: ticket.order_id,
          message: `SupportTicket ${ticket.id} order não-existente: ${ticket.order_id}`
        });
        stats.orphaned_records++;
      }
    }

    // 10. Validate AssociatePlacements → Associates
    for (const placement of placements) {
      if (!associateIds.has(placement.associate_id)) {
        issues.push({
          severity: 'error',
          type: 'orphaned_placement_associate',
          placement_id: placement.id,
          associate_id: placement.associate_id,
          message: `AssociatePlacement ${placement.id} associate não-existente: ${placement.associate_id}`
        });
        stats.orphaned_records++;
        stats.broken_relationships++;
      }

      if (!associateIds.has(placement.target_sponsor_id)) {
        issues.push({
          severity: 'error',
          type: 'orphaned_placement_target_sponsor',
          placement_id: placement.id,
          target_sponsor_id: placement.target_sponsor_id,
          message: `AssociatePlacement ${placement.id} target_sponsor não-existente: ${placement.target_sponsor_id}`
        });
        stats.orphaned_records++;
        stats.broken_relationships++;
      }
    }

    // 11. Network level validation
    for (const assoc of associates) {
      if (assoc.sponsor_id) {
        const sponsor = associates.find(a => a.id === assoc.sponsor_id);
        if (sponsor && sponsor.level_in_network !== undefined && assoc.level_in_network !== undefined) {
          const expectedLevel = (sponsor.level_in_network || 0) + 1;
          if (assoc.level_in_network !== expectedLevel) {
            issues.push({
              severity: 'warning',
              type: 'network_level_mismatch',
              associate_id: assoc.id,
              expected_level: expectedLevel,
              actual_level: assoc.level_in_network,
              message: `Associate ${assoc.id} network level diverge: esperado ${expectedLevel}, encontrado ${assoc.level_in_network}`
            });
          }
        }
      }
    }

    return Response.json({
      success: true,
      stats,
      issues: issues.sort((a, b) => {
        const severityOrder = { critical: 0, error: 1, warning: 2 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      }),
      summary: {
        total_issues: issues.length,
        critical: issues.filter(i => i.severity === 'critical').length,
        errors: issues.filter(i => i.severity === 'error').length,
        warnings: issues.filter(i => i.severity === 'warning').length
      }
    });
  } catch (error) {
    console.error('Erro na auditoria:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});