# PLANO DE MIGRAÇÃO - REFATORAÇÃO ESTRUTURAL BD

**Status:** Fase 1 Implementada - Novas Entidades Criadas  
**Data Início:** 2026-06-04  

---

## RESUMO EXECUTIVO

Refatoração de 24 entidades para implementar:
- ✅ **3 tabelas de junção** (AssociateRole, AssociatePlacement, AssociateAddress)
- ✅ **FKs formais** em todas as entidades relacionadas
- ✅ **Documentação atualizada** com descrição de relacionamentos
- ⏳ **Migração de dados** (próxima fase)
- ⏳ **Validação e rollback** (próxima fase)

---

## NOVAS ENTIDADES CRIADAS

### 1. AssociateRole (N:N)
Substitui relacionamento implícito Associate → Role

```json
{
  "associate_id": "FK → Associate",
  "role_name": "string (FK → Role.name)",
  "assigned_at": "timestamp"
}
```

**Migração de dados:**
```sql
INSERT INTO AssociateRole (associate_id, role_name, assigned_at)
SELECT id, (SELECT role FROM User WHERE id = Associate.user_id), NOW()
FROM Associate
WHERE user_id IS NOT NULL
```

---

### 2. AssociatePlacement (N:N)
Substitui/expande PlacementRequest com melhor relacionamento

```json
{
  "associate_id": "FK → Associate",
  "target_sponsor_id": "FK → Associate",
  "original_sponsor_id": "FK → Associate (opcional)",
  "status": "enum",
  "admin_notes": "string",
  "created_at": "timestamp"
}
```

**Migração de dados:**
```sql
INSERT INTO AssociatePlacement (associate_id, target_sponsor_id, original_sponsor_id, status, created_at)
SELECT 
  associate_id,
  target_sponsor_id,
  original_sponsor_id,
  status,
  created_at
FROM PlacementRequest
```

**Pós-migração:** PlacementRequest pode ser deprecada

---

### 3. AssociateAddress (Normalização)
Consolida 3 endereços de Associate em tabela separada

```json
{
  "associate_id": "FK → Associate",
  "type": "enum (shipping, billing, residence)",
  "street": "string",
  "number": "string",
  "complement": "string",
  "neighborhood": "string",
  "city": "string",
  "state": "string",
  "zip": "string",
  "is_primary": "boolean",
  "created_at": "timestamp"
}
```

**Migração de dados:**
```sql
-- Endereço de entrega
INSERT INTO AssociateAddress (associate_id, type, street, number, complement, neighborhood, city, state, zip, is_primary)
SELECT id, 'shipping', shipping_street, shipping_number, shipping_complement, shipping_neighborhood, shipping_city, shipping_state, shipping_zip, TRUE
FROM Associate
WHERE shipping_street IS NOT NULL;

-- Endereço de faturamento
INSERT INTO AssociateAddress (associate_id, type, street, number, complement, neighborhood, city, state, zip, is_primary)
SELECT id, 'billing', billing_street, billing_number, billing_complement, billing_neighborhood, billing_city, billing_state, billing_zip, FALSE
FROM Associate
WHERE billing_street IS NOT NULL AND billing_same_as_shipping = FALSE;
```

---

## ENTIDADES ATUALIZADAS COM FKs

### Associate
- ✅ `user_id` → User (FK)
- ✅ `sponsor_id` → Associate (FK self-referential)
- ℹ️ Campos legados mantidos: shipping_*, billing_* (para compatibilidade)

### Order
- ✅ `associate_id` → Associate (FK)
- ✅ `product_id` → Product (FK)
- ✅ `shipping_method_id` → ShippingMethod (FK)

### Commission
- ✅ `order_id` → Order (FK)
- ✅ `beneficiary_id` → Associate (FK)
- ✅ `originator_id` → Associate (FK)
- ✅ `product_id` → Product (FK)

### SupportTicket
- ✅ `order_id` → Order (FK)
- ✅ `associate_id` → Associate (FK)

### Review
- ✅ `order_id` → Order (FK)
- ✅ `associate_id` → Associate (FK)
- ✅ `product_id` → Product (FK)

### WithdrawalRequest
- ✅ `associate_id` → Associate (FK)

### CardRequest
- ✅ `associate_id` → Associate (FK)

### CardSpendingProof
- ✅ `associate_id` → Associate (FK)

### ExternalLinkClick
- ✅ `associate_id` → Associate (FK)
- ✅ `product_id` → Product (FK, opcional)
- ✅ `banner_id` → StoreBanner (FK, opcional)

### Notification
- ✅ `associate_id` → Associate (FK)

### Subscription
- ✅ `associate_id` → Associate (FK)

---

## IMPACTO NA COMPATIBILIDADE

### SEM IMPACTO (Fields Mantidos)
- ✅ Todos os campos de Associate mantidos
- ✅ Campos de Order intactos
- ✅ Campos snapshots de nomes preservados (auditoria)
- ✅ APIs públicas mantidas

### COM ADAPTAÇÃO (Camada de Dados)
- ⚠️ Queries para endereços: adicionar JOIN com AssociateAddress
- ⚠️ Queries para roles: adicionar JOIN com AssociateRole
- ⚠️ Queries para placement: usar AssociatePlacement em vez de PlacementRequest

### TESTES RECOMENDADOS
```javascript
// Antes de migrar dados:
1. Validar que ALL Associate records têm associate_id válido em Orders
2. Validar que ALL Orders têm product_id válido em Products
3. Validar que ALL Commissions têm order_id válido em Orders
4. Validar ciclos em Associate.sponsor_id (detectar A→B→C→A)
5. Validar que NO Associate é órfão (sem sponsor_id se não for root)
```

---

## FASE 2: MIGRAÇÃO DE DADOS (Próxima)

### Passo-a-Passo

**1. Backup Completo**
```bash
# Backup de todas as entidades
base44.entities.*.list() → JSON files
```

**2. Criar Registros de Junção**
```javascript
// AssociateRole
const associates = await base44.entities.Associate.list();
for (const a of associates) {
  if (a.user_id) {
    const user = await base44.entities.User.list({user_id: a.user_id});
    if (user?.role) {
      await base44.entities.AssociateRole.create({
        associate_id: a.id,
        role_name: user.role,
        assigned_at: new Date().toISOString()
      });
    }
  }
}

// AssociatePlacement
const placements = await base44.entities.PlacementRequest.list();
for (const p of placements) {
  await base44.entities.AssociatePlacement.create({
    associate_id: p.associate_id,
    target_sponsor_id: p.target_sponsor_id,
    original_sponsor_id: p.original_sponsor_id,
    status: p.status,
    admin_notes: p.admin_notes,
    created_at: p.created_at || new Date().toISOString()
  });
}

// AssociateAddress
for (const a of associates) {
  // Shipping
  if (a.shipping_street) {
    await base44.entities.AssociateAddress.create({
      associate_id: a.id,
      type: 'shipping',
      street: a.shipping_street,
      number: a.shipping_number,
      complement: a.shipping_complement,
      neighborhood: a.shipping_neighborhood,
      city: a.shipping_city,
      state: a.shipping_state,
      zip: a.shipping_zip,
      is_primary: true,
      created_at: new Date().toISOString()
    });
  }
  
  // Billing
  if (a.billing_street && !a.billing_same_as_shipping) {
    await base44.entities.AssociateAddress.create({
      associate_id: a.id,
      type: 'billing',
      street: a.billing_street,
      number: a.billing_number,
      complement: a.billing_complement,
      neighborhood: a.billing_neighborhood,
      city: a.billing_city,
      state: a.billing_state,
      zip: a.billing_zip,
      is_primary: false,
      created_at: new Date().toISOString()
    });
  }
}
```

**3. Validar Integridade**
```javascript
// Verificar órfãos
const orders = await base44.entities.Order.list();
for (const o of orders) {
  const assoc = await base44.entities.Associate.filter({id: o.associate_id});
  if (!assoc.length) console.error(`Order ${o.id} orfã`);
}

// Verificar ciclos em sponsor_id
const detectCycles = (associates) => {
  for (const a of associates) {
    const visited = new Set();
    let current = a;
    while (current?.sponsor_id) {
      if (visited.has(current.id)) {
        return { cycleFound: true, associate: a.id };
      }
      visited.add(current.id);
      current = associates.find(x => x.id === current.sponsor_id);
    }
  }
  return { cycleFound: false };
};
```

**4. Gerar Rollback Script**
```javascript
// Se algo der errado, deletar novas tabelas
const cleanup = async () => {
  await base44.entities.AssociateRole.delete({});
  await base44.entities.AssociatePlacement.delete({});
  await base44.entities.AssociateAddress.delete({});
};
```

---

## FASE 3: ATIVAÇÃO (Após validação)

### Quando confirmar integridade:
1. ✅ Nenhum órfão detectado
2. ✅ Nenhum ciclo em sponsor_id
3. ✅ Contagem de registros confere
4. ✅ Testes de aplicação passam

### Então:
- Atualizar backend functions para usar novas tabelas
- Remover campos legados (opcional)
- Deprecar PlacementRequest (opcional)

---

## ROLLBACK PLAN

Se necessário reverter:
```javascript
// 1. Deletar novos registros
await base44.entities.AssociateRole.delete({});
await base44.entities.AssociatePlacement.delete({});
await base44.entities.AssociateAddress.delete({});

// 2. Restaurar do backup
// Todos os dados originais intactos em Associate, Order, etc
```

**Tempo de rollback:** < 1 minuto

---

## PRÓXIMOS PASSOS

1. ✅ Fase 1 completa (entidades criadas)
2. ⏳ Aprovar Fase 2 (migração de dados)
3. ⏳ Executar Fase 2
4. ⏳ Validar dados
5. ⏳ Fase 3 (ativação)
6. ⏳ Atualizar backend functions
7. ⏳ Remover campos redundantes (opcional)

**Aguardando aprovação para prosseguir com Fase 2.**