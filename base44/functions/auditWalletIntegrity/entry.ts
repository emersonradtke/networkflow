import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const issues = [];

    // 1. Fetch all Associates
    const associates = await base44.asServiceRole.entities.Associate.list();
    const associateIds = new Set(associates.map(a => a.id));

    // 2. Validar integridade de saldo (wallet_balance, total_earned, total_withdrawn)
    let total_orphaned_balance = 0;
    let associates_with_balance_issues = 0;

    for (const assoc of associates) {
      const wallet = assoc.wallet_balance || 0;
      const earned = assoc.total_earned || 0;
      const withdrawn = assoc.total_withdrawn || 0;

      // Validar: earned - withdrawn = wallet_balance (com margem de erro de centavos)
      const expectedBalance = earned - withdrawn;
      if (Math.abs(wallet - expectedBalance) > 0.01) {
        issues.push({
          severity: 'error',
          type: 'balance_mismatch',
          associate_id: assoc.id,
          associate_name: assoc.full_name,
          wallet_balance: wallet,
          total_earned: earned,
          total_withdrawn: withdrawn,
          expected_balance: expectedBalance,
          message: `Associate ${assoc.full_name}: wallet_balance ${wallet} ≠ earned ${earned} - withdrawn ${withdrawn} (esperado: ${expectedBalance})`
        });
      }

      // Verificar saldo negativo não intencional
      if (wallet < 0) {
        issues.push({
          severity: 'warning',
          type: 'negative_balance',
          associate_id: assoc.id,
          associate_name: assoc.full_name,
          wallet_balance: wallet,
          message: `Associate ${assoc.full_name} tem saldo negativo: ${wallet}`
        });
      }

      if (wallet > 0 && (!assoc.id || !associateIds.has(assoc.id))) {
        total_orphaned_balance += wallet;
        associates_with_balance_issues++;
      }
    }

    // 3. Validar integridade de diretos (downline - sponsor relationships)
    let downline_count_mismatches = 0;

    for (const assoc of associates) {
      // Contar quantos associados têm este como sponsor
      const directDownline = associates.filter(a => a.sponsor_id === assoc.id).length;

      // Se houver um campo "diretos" ou "direct_associates", validar
      // (assumindo que alguma entidade pode ter essa contagem)
      if (assoc.diretos !== undefined && assoc.diretos !== directDownline) {
        issues.push({
          severity: 'warning',
          type: 'downline_count_mismatch',
          associate_id: assoc.id,
          associate_name: assoc.full_name,
          recorded_diretos: assoc.diretos,
          actual_diretos: directDownline,
          message: `Associate ${assoc.full_name}: campo 'diretos' registra ${assoc.diretos}, mas há ${directDownline} diretos reais`
        });
        downline_count_mismatches++;
      }
    }

    // Detectar orfãos: referências a sponsors que não existem
    let orphaned_sponsor_refs = 0;
    for (const assoc of associates) {
      if (assoc.sponsor_id && !associateIds.has(assoc.sponsor_id)) {
        orphaned_sponsor_refs++;
        issues.push({
          severity: 'critical',
          type: 'orphaned_sponsor_reference',
          associate_id: assoc.id,
          associate_name: assoc.full_name,
          sponsor_id: assoc.sponsor_id,
          message: `Associate ${assoc.full_name} referencia sponsor inexistente: ${assoc.sponsor_id}`
        });
      }
    }

    // 4. Validar integridade de pontos (total_pontos)
    let total_orphaned_pontos = 0;
    let pontos_issues = 0;

    for (const assoc of associates) {
      const pontos = assoc.total_pontos || 0;

      // Pontos não devem ser negativos
      if (pontos < 0) {
        issues.push({
          severity: 'error',
          type: 'negative_pontos',
          associate_id: assoc.id,
          associate_name: assoc.full_name,
          total_pontos: pontos,
          message: `Associate ${assoc.full_name} tem pontos negativos: ${pontos}`
        });
        pontos_issues++;
      }

      // Acumular pontos órfãos potenciais
      if (pontos > 0 && !assoc.id) {
        total_orphaned_pontos += pontos;
      }
    }

    // 5. Validar referências cruzadas com Orders/Commissions
    const orders = await base44.asServiceRole.entities.Order.list();
    const commissions = await base44.asServiceRole.entities.Commission.list();

    // Verificar se há orders/commissions referenciando associates deletados
    let orphaned_orders = 0;
    let orphaned_commissions = 0;

    for (const order of orders) {
      if (!associateIds.has(order.associate_id)) {
        orphaned_orders++;
        if (orphaned_orders <= 5) { // Mostrar apenas os primeiros 5
          issues.push({
            severity: 'error',
            type: 'orphaned_order_associate',
            order_id: order.id,
            associate_id: order.associate_id,
            amount: order.amount,
            message: `Order ${order.id} referencia associate deletado: ${order.associate_id}`
          });
        }
      }
    }

    for (const commission of commissions) {
      if (!associateIds.has(commission.beneficiary_id) || (commission.originator_id && !associateIds.has(commission.originator_id))) {
        orphaned_commissions++;
        if (orphaned_commissions <= 5) {
          issues.push({
            severity: 'error',
            type: 'orphaned_commission_associate',
            commission_id: commission.id,
            beneficiary_id: commission.beneficiary_id,
            amount: commission.commission_amount,
            message: `Commission ${commission.id} referencia associate deletado`
          });
        }
      }
    }

    return Response.json({
      success: true,
      audit_date: new Date().toISOString(),
      summary: {
        total_associates: associates.length,
        total_issues: issues.length,
        critical: issues.filter(i => i.severity === 'critical').length,
        errors: issues.filter(i => i.severity === 'error').length,
        warnings: issues.filter(i => i.severity === 'warning').length,
        financial_integrity: {
          total_orphaned_balance: total_orphaned_balance,
          associates_with_balance_issues,
          total_orphaned_pontos,
          pontos_issues
        },
        network_integrity: {
          downline_count_mismatches,
          orphaned_sponsor_references: orphaned_sponsor_refs
        },
        orphaned_records: {
          orders: orphaned_orders,
          commissions: orphaned_commissions
        }
      },
      issues: issues.sort((a, b) => {
        const severityOrder = { critical: 0, error: 1, warning: 2 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      })
    });
  } catch (error) {
    console.error('Erro na auditoria:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});