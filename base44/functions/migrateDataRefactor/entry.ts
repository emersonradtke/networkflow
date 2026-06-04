import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Only admins
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { action } = await req.json();

    if (action === 'migrate') {
      return await migrateData(base44);
    } else if (action === 'validate') {
      return await validateIntegrity(base44);
    } else if (action === 'rollback') {
      return await rollbackMigration(base44);
    } else if (action === 'status') {
      return await getMigrationStatus(base44);
    } else {
      return Response.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function migrateData(base44) {
  const report = {
    timestamp: new Date().toISOString(),
    action: 'migrate',
    status: 'in_progress',
    counts: {
      associate_roles_created: 0,
      associate_placements_created: 0,
      associate_addresses_created: 0,
      errors: []
    }
  };

  try {
    // 1. Migrate AssociateRole (Associate → Role mapping)
    const associates = await base44.asServiceRole.entities.Associate.list();
    for (const assoc of associates) {
      try {
        if (assoc.user_id) {
          // Get user to find role
          const users = await base44.asServiceRole.entities.User.filter({ id: assoc.user_id });
          if (users.length > 0 && users[0].role) {
            // Check if already migrated
            const existing = await base44.asServiceRole.entities.AssociateRole.filter({
              associate_id: assoc.id,
              role_name: users[0].role
            });
            if (existing.length === 0) {
              await base44.asServiceRole.entities.AssociateRole.create({
                associate_id: assoc.id,
                role_name: users[0].role,
                assigned_at: new Date().toISOString()
              });
              report.counts.associate_roles_created++;
            }
          }
        }
      } catch (e) {
        report.counts.errors.push(`AssociateRole ${assoc.id}: ${e.message}`);
      }
    }

    // 2. Migrate AssociatePlacement (PlacementRequest → AssociatePlacement)
    const placements = await base44.asServiceRole.entities.PlacementRequest.list();
    for (const placement of placements) {
      try {
        const existing = await base44.asServiceRole.entities.AssociatePlacement.filter({
          associate_id: placement.associate_id,
          target_sponsor_id: placement.target_sponsor_id
        });
        if (existing.length === 0) {
          await base44.asServiceRole.entities.AssociatePlacement.create({
            associate_id: placement.associate_id,
            target_sponsor_id: placement.target_sponsor_id,
            original_sponsor_id: placement.original_sponsor_id || null,
            status: placement.status || 'pending',
            admin_notes: placement.admin_notes || '',
            created_at: placement.created_at || new Date().toISOString()
          });
          report.counts.associate_placements_created++;
        }
      } catch (e) {
        report.counts.errors.push(`AssociatePlacement ${placement.id}: ${e.message}`);
      }
    }

    // 3. Migrate AssociateAddress (shipping/billing/residence)
    for (const assoc of associates) {
      try {
        // Shipping address
        if (assoc.shipping_street) {
          const existingShip = await base44.asServiceRole.entities.AssociateAddress.filter({
            associate_id: assoc.id,
            type: 'shipping'
          });
          if (existingShip.length === 0) {
            await base44.asServiceRole.entities.AssociateAddress.create({
              associate_id: assoc.id,
              type: 'shipping',
              street: assoc.shipping_street || '',
              number: assoc.shipping_number || '',
              complement: assoc.shipping_complement || '',
              neighborhood: assoc.shipping_neighborhood || '',
              city: assoc.shipping_city || '',
              state: assoc.shipping_state || '',
              zip: assoc.shipping_zip || '',
              is_primary: true,
              created_at: new Date().toISOString()
            });
            report.counts.associate_addresses_created++;
          }
        }

        // Billing address (if different from shipping)
        if (assoc.billing_street && !assoc.billing_same_as_shipping) {
          const existingBill = await base44.asServiceRole.entities.AssociateAddress.filter({
            associate_id: assoc.id,
            type: 'billing'
          });
          if (existingBill.length === 0) {
            await base44.asServiceRole.entities.AssociateAddress.create({
              associate_id: assoc.id,
              type: 'billing',
              street: assoc.billing_street || '',
              number: assoc.billing_number || '',
              complement: assoc.billing_complement || '',
              neighborhood: assoc.billing_neighborhood || '',
              city: assoc.billing_city || '',
              state: assoc.billing_state || '',
              zip: assoc.billing_zip || '',
              is_primary: false,
              created_at: new Date().toISOString()
            });
            report.counts.associate_addresses_created++;
          }
        }
      } catch (e) {
        report.counts.errors.push(`AssociateAddress ${assoc.id}: ${e.message}`);
      }
    }

    report.status = 'success';
    return Response.json(report);
  } catch (error) {
    report.status = 'failed';
    report.counts.errors.push(error.message);
    return Response.json(report, { status: 500 });
  }
}

async function validateIntegrity(base44) {
  const validation = {
    timestamp: new Date().toISOString(),
    action: 'validate',
    status: 'success',
    checks: {
      orphaned_orders: [],
      orphaned_commissions: [],
      orphaned_support_tickets: [],
      orphaned_reviews: [],
      sponsor_cycles: [],
      summary: {}
    }
  };

  try {
    // 1. Check for orphaned Orders
    const orders = await base44.asServiceRole.entities.Order.list();
    const associates = await base44.asServiceRole.entities.Associate.list();
    const associateIds = new Set(associates.map(a => a.id));

    for (const order of orders) {
      if (!associateIds.has(order.associate_id)) {
        validation.checks.orphaned_orders.push({
          order_id: order.id,
          order_number: order.order_number,
          associate_id: order.associate_id
        });
      }
    }

    // 2. Check for orphaned Commissions
    const commissions = await base44.asServiceRole.entities.Commission.list();
    const orderIds = new Set(orders.map(o => o.id));
    for (const commission of commissions) {
      if (!orderIds.has(commission.order_id)) {
        validation.checks.orphaned_commissions.push({
          commission_id: commission.id,
          order_id: commission.order_id
        });
      }
      if (!associateIds.has(commission.beneficiary_id)) {
        validation.checks.orphaned_commissions.push({
          commission_id: commission.id,
          beneficiary_id: commission.beneficiary_id,
          reason: 'beneficiary not found'
        });
      }
    }

    // 3. Check for orphaned SupportTickets
    const tickets = await base44.asServiceRole.entities.SupportTicket.list();
    for (const ticket of tickets) {
      if (!orderIds.has(ticket.order_id)) {
        validation.checks.orphaned_support_tickets.push({
          ticket_id: ticket.id,
          order_id: ticket.order_id
        });
      }
    }

    // 4. Check for orphaned Reviews
    const reviews = await base44.asServiceRole.entities.Review.list();
    for (const review of reviews) {
      if (!orderIds.has(review.order_id)) {
        validation.checks.orphaned_reviews.push({
          review_id: review.id,
          order_id: review.order_id
        });
      }
    }

    // 5. Detect cycles in sponsor_id
    const detectCycles = (associates) => {
      const cycles = [];
      for (const assoc of associates) {
        const visited = new Set([assoc.id]);
        let current = assoc;
        let depth = 0;
        const maxDepth = 100; // safety limit

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

    validation.checks.sponsor_cycles = detectCycles(associates);

    // Summary
    validation.checks.summary = {
      total_orders: orders.length,
      orphaned_orders: validation.checks.orphaned_orders.length,
      total_commissions: commissions.length,
      orphaned_commissions: validation.checks.orphaned_commissions.length,
      total_support_tickets: tickets.length,
      orphaned_support_tickets: validation.checks.orphaned_support_tickets.length,
      total_reviews: reviews.length,
      orphaned_reviews: validation.checks.orphaned_reviews.length,
      total_associates: associates.length,
      associates_with_cycles: validation.checks.sponsor_cycles.length,
      migration_valid: validation.checks.orphaned_orders.length === 0 &&
                      validation.checks.orphaned_commissions.length === 0 &&
                      validation.checks.orphaned_support_tickets.length === 0 &&
                      validation.checks.orphaned_reviews.length === 0 &&
                      validation.checks.sponsor_cycles.length === 0
    };

    if (!validation.checks.summary.migration_valid) {
      validation.status = 'warning';
    }

    return Response.json(validation);
  } catch (error) {
    validation.status = 'failed';
    validation.error = error.message;
    return Response.json(validation, { status: 500 });
  }
}

async function getMigrationStatus(base44) {
  try {
    const status = {
      timestamp: new Date().toISOString(),
      tables: {}
    };

    const tables = [
      'AssociateRole',
      'AssociatePlacement',
      'AssociateAddress'
    ];

    for (const table of tables) {
      const data = await base44.asServiceRole.entities[table].list();
      status.tables[table] = data.length;
    }

    // Check if migration was done before
    status.migration_completed = Object.values(status.tables).some(count => count > 0);

    return Response.json(status);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

async function rollbackMigration(base44) {
  const report = {
    timestamp: new Date().toISOString(),
    action: 'rollback',
    status: 'in_progress',
    deleted: {
      associate_roles: 0,
      associate_placements: 0,
      associate_addresses: 0
    }
  };

  try {
    // Delete all records from new tables (CASCADE will be handled by backend)
    const roleRecords = await base44.asServiceRole.entities.AssociateRole.list();
    for (const record of roleRecords) {
      await base44.asServiceRole.entities.AssociateRole.delete(record.id);
      report.deleted.associate_roles++;
    }

    const placementRecords = await base44.asServiceRole.entities.AssociatePlacement.list();
    for (const record of placementRecords) {
      await base44.asServiceRole.entities.AssociatePlacement.delete(record.id);
      report.deleted.associate_placements++;
    }

    const addressRecords = await base44.asServiceRole.entities.AssociateAddress.list();
    for (const record of addressRecords) {
      await base44.asServiceRole.entities.AssociateAddress.delete(record.id);
      report.deleted.associate_addresses++;
    }

    report.status = 'success';
    return Response.json(report);
  } catch (error) {
    report.status = 'failed';
    report.error = error.message;
    return Response.json(report, { status: 500 });
  }
}