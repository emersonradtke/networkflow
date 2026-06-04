import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    return await runAudit(base44);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function runAudit(base44) {
  const audit = {
    timestamp: new Date().toISOString(),
    status: 'completed',
    checks: {
      orphaned_orders: [],
      orphaned_commissions: [],
      orphaned_support_tickets: [],
      orphaned_reviews: [],
      orphaned_external_links: [],
      sponsor_cycles: [],
      duplicate_emails: [],
      invalid_dates: [],
      constraint_violations: []
    },
    summary: {
      total_checks: 8,
      issues_found: 0,
      severity: 'none'
    }
  };

  try {
    // 1. Fetch all entities
    const [associates, orders, commissions, tickets, reviews, externalLinks, products] = await Promise.all([
      base44.asServiceRole.entities.Associate.list(),
      base44.asServiceRole.entities.Order.list(),
      base44.asServiceRole.entities.Commission.list(),
      base44.asServiceRole.entities.SupportTicket.list(),
      base44.asServiceRole.entities.Review.list(),
      base44.asServiceRole.entities.ExternalLinkClick.list(),
      base44.asServiceRole.entities.Product.list()
    ]);

    const associateIds = new Set(associates.map(a => a.id));
    const orderIds = new Set(orders.map(o => o.id));
    const productIds = new Set(products.map(p => p.id));

    // 2. Check orphaned Orders
    for (const order of orders) {
      if (!associateIds.has(order.associate_id)) {
        audit.checks.orphaned_orders.push({
          order_id: order.id,
          order_number: order.order_number,
          missing_associate: order.associate_id
        });
      }
    }

    // 3. Check orphaned Commissions
    for (const commission of commissions) {
      const issues = [];
      if (!orderIds.has(commission.order_id)) issues.push('missing_order');
      if (!associateIds.has(commission.beneficiary_id)) issues.push('missing_beneficiary');
      if (!associateIds.has(commission.originator_id)) issues.push('missing_originator');
      
      if (issues.length > 0) {
        audit.checks.orphaned_commissions.push({
          commission_id: commission.id,
          issues
        });
      }
    }

    // 4. Check orphaned SupportTickets
    for (const ticket of tickets) {
      if (!orderIds.has(ticket.order_id)) {
        audit.checks.orphaned_support_tickets.push({
          ticket_id: ticket.id,
          missing_order: ticket.order_id
        });
      }
      if (!associateIds.has(ticket.associate_id)) {
        audit.checks.orphaned_support_tickets.push({
          ticket_id: ticket.id,
          missing_associate: ticket.associate_id
        });
      }
    }

    // 5. Check orphaned Reviews
    for (const review of reviews) {
      if (!orderIds.has(review.order_id)) {
        audit.checks.orphaned_reviews.push({
          review_id: review.id,
          missing_order: review.order_id
        });
      }
      if (!productIds.has(review.product_id)) {
        audit.checks.orphaned_reviews.push({
          review_id: review.id,
          missing_product: review.product_id
        });
      }
    }

    // 6. Check orphaned ExternalLinkClicks
    for (const click of externalLinks) {
      if (!associateIds.has(click.associate_id)) {
        audit.checks.orphaned_external_links.push({
          click_id: click.id,
          missing_associate: click.associate_id
        });
      }
    }

    // 7. Detect sponsor cycles
    const detectCycles = (associates) => {
      const cycles = [];
      for (const assoc of associates) {
        const visited = new Set([assoc.id]);
        let current = assoc;
        let depth = 0;
        const maxDepth = 100;

        while (current?.sponsor_id && depth < maxDepth) {
          if (visited.has(current.sponsor_id)) {
            cycles.push({
              associate_id: assoc.id,
              associate_name: assoc.full_name,
              cycle_detected: true
            });
            break;
          }
          visited.add(current.sponsor_id);
          current = associates.find(a => a.id === current.sponsor_id);
          depth++;
        }
      }
      return cycles;
    };

    audit.checks.sponsor_cycles = detectCycles(associates);

    // 8. Check duplicate emails
    const emailMap = {};
    for (const assoc of associates) {
      if (assoc.email) {
        if (!emailMap[assoc.email]) {
          emailMap[assoc.email] = [];
        }
        emailMap[assoc.email].push(assoc.id);
      }
    }
    
    for (const [email, ids] of Object.entries(emailMap)) {
      if (ids.length > 1) {
        audit.checks.duplicate_emails.push({
          email,
          associate_ids: ids,
          count: ids.length
        });
      }
    }

    // 9. Check invalid dates (future dates in critical fields)
    const now = new Date();
    for (const order of orders) {
      if (order.created_date && new Date(order.created_date) > now) {
        audit.checks.invalid_dates.push({
          type: 'order',
          id: order.id,
          field: 'created_date'
        });
      }
    }

    // Calculate summary
    for (const [key, value] of Object.entries(audit.checks)) {
      if (Array.isArray(value)) {
        audit.summary.issues_found += value.length;
      }
    }

    if (audit.summary.issues_found > 0) {
      audit.summary.severity = audit.summary.issues_found > 10 ? 'critical' : audit.summary.issues_found > 5 ? 'warning' : 'minor';
    }

    // 10. Store audit report
    try {
      await base44.asServiceRole.entities.AuditLog.create({
        audit_type: 'continuous_integrity_check',
        timestamp: audit.timestamp,
        summary: JSON.stringify(audit.summary),
        details: JSON.stringify(audit.checks),
        severity: audit.summary.severity
      });
    } catch (e) {
      // AuditLog might not exist — silent fail
      console.warn('Could not store audit log:', e.message);
    }

    return Response.json(audit);
  } catch (error) {
    audit.status = 'failed';
    audit.error = error.message;
    return Response.json(audit, { status: 500 });
  }
}