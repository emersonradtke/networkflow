import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { action } = await req.json();

    if (action === 'deprecate') {
      return await deprecateLegacyFields(base44);
    } else if (action === 'status') {
      return await getDeprecationStatus(base44);
    } else if (action === 'restore') {
      return await restoreLegacyFields(base44);
    } else {
      return Response.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function deprecateLegacyFields(base44) {
  const report = {
    timestamp: new Date().toISOString(),
    action: 'deprecate',
    status: 'in_progress',
    associates_updated: 0,
    orders_updated: 0,
    errors: []
  };

  const LEGACY_ADDRESS_FIELDS = [
    'address',
    'shipping_street', 'shipping_number', 'shipping_complement', 'shipping_neighborhood',
    'shipping_city', 'shipping_state', 'shipping_zip',
    'billing_street', 'billing_number', 'billing_complement', 'billing_neighborhood',
    'billing_city', 'billing_state', 'billing_zip',
    'addresses_completed', 'billing_same_as_shipping'
  ];

  try {
    // 1. Clear legacy address fields in Associate
    const associates = await base44.asServiceRole.entities.Associate.list();
    for (const assoc of associates) {
      try {
        const update = {};
        for (const field of LEGACY_ADDRESS_FIELDS) {
          update[field] = null;
        }
        await base44.asServiceRole.entities.Associate.update(assoc.id, update);
        report.associates_updated++;
      } catch (e) {
        report.errors.push(`Associate ${assoc.id}: ${e.message}`);
      }
    }

    // 2. Clear legacy address fields in Order
    const orders = await base44.asServiceRole.entities.Order.list();
    const ORDER_LEGACY_FIELDS = [
      'shipping_street', 'shipping_number', 'shipping_complement', 'shipping_neighborhood',
      'shipping_city', 'shipping_state', 'shipping_zip',
      'billing_street', 'billing_number', 'billing_complement', 'billing_neighborhood',
      'billing_city', 'billing_state', 'billing_zip'
    ];

    for (const order of orders) {
      try {
        const update = {};
        for (const field of ORDER_LEGACY_FIELDS) {
          update[field] = null;
        }
        await base44.asServiceRole.entities.Order.update(order.id, update);
        report.orders_updated++;
      } catch (e) {
        report.errors.push(`Order ${order.id}: ${e.message}`);
      }
    }

    report.status = 'success';
    return Response.json(report);
  } catch (error) {
    report.status = 'failed';
    report.errors.push(error.message);
    return Response.json(report, { status: 500 });
  }
}

async function getDeprecationStatus(base44) {
  try {
    const associates = await base44.asServiceRole.entities.Associate.list();
    const orders = await base44.asServiceRole.entities.Order.list();

    const LEGACY_ADDRESS_FIELDS = [
      'address',
      'shipping_street', 'shipping_number', 'shipping_complement', 'shipping_neighborhood',
      'shipping_city', 'shipping_state', 'shipping_zip',
      'billing_street', 'billing_number', 'billing_complement', 'billing_neighborhood',
      'billing_city', 'billing_state', 'billing_zip',
      'addresses_completed', 'billing_same_as_shipping'
    ];

    let associatesWithLegacy = 0;
    for (const assoc of associates) {
      for (const field of LEGACY_ADDRESS_FIELDS) {
        if (assoc[field] !== null && assoc[field] !== undefined && assoc[field] !== '') {
          associatesWithLegacy++;
          break;
        }
      }
    }

    const ORDER_LEGACY_FIELDS = [
      'shipping_street', 'shipping_number', 'shipping_complement', 'shipping_neighborhood',
      'shipping_city', 'shipping_state', 'shipping_zip',
      'billing_street', 'billing_number', 'billing_complement', 'billing_neighborhood',
      'billing_city', 'billing_state', 'billing_zip'
    ];

    let ordersWithLegacy = 0;
    for (const order of orders) {
      for (const field of ORDER_LEGACY_FIELDS) {
        if (order[field] !== null && order[field] !== undefined && order[field] !== '') {
          ordersWithLegacy++;
          break;
        }
      }
    }

    const deprecated = associatesWithLegacy === 0 && ordersWithLegacy === 0;

    return Response.json({
      timestamp: new Date().toISOString(),
      status: deprecated ? 'deprecated' : 'active',
      summary: {
        total_associates: associates.length,
        associates_with_legacy: associatesWithLegacy,
        total_orders: orders.length,
        orders_with_legacy: ordersWithLegacy,
        legacy_fields: {
          associate: LEGACY_ADDRESS_FIELDS.length,
          order: ORDER_LEGACY_FIELDS.length
        },
        deprecation_complete: deprecated
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

async function restoreLegacyFields(base44) {
  return Response.json({
    error: 'Restore not available — legacy fields are archived. Use backups if needed.',
    status: 'deprecated'
  }, { status: 403 });
}