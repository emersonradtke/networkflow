# Plano de Integridade Referencial - BoldLife

## Resumo Executivo
Implementação de Foreign Keys (FKs) virtuais e validações para garantir que nenhum dado órfão permaneça no sistema após deletions.

## Estrutura de Relacionamentos Críticos

### 1. **ASSOCIATE** (núcleo da rede)
```
Associate.user_id → User.id [FK CRÍTICA]
  - ON DELETE: RESTRICT (impossibilitar deletar user com associate)
  - ON UPDATE: CASCADE

Associate.sponsor_id → Associate.id [FK CRÍTICA, self-referential]
  - ON DELETE: SET NULL (orphan se sponsor deletado)
  - Validação: Detectar ciclos na genealogia
```

### 2. **ORDER** (transações)
```
Order.associate_id → Associate.id [FK CRÍTICA]
  - ON DELETE: RESTRICT (impossibilitar deletar associate com orders pendentes)
  - Validação: Verificar status antes de permitir delete

Order.product_id → Product.id [FK CRÍTICA]
  - ON DELETE: RESTRICT (impossibilitar deletar produto em venda)
  - ON UPDATE: CASCADE (atualizar snapshots)

Order.shipping_method_id → ShippingMethod.id [FK CRÍTICA]
  - ON DELETE: RESTRICT
```

### 3. **COMMISSION** (ganhos)
```
Commission.beneficiary_id → Associate.id [FK CRÍTICA]
  - ON DELETE: CASCADE (deletar comissões ao deletar associate)
  - Validação: Verificar valor na carteira antes de delete

Commission.originator_id → Associate.id [FK CRÍTICA]
  - ON DELETE: CASCADE

Commission.order_id → Order.id [FK CRÍTICA]
  - ON DELETE: CASCADE (comissão depende do order)
```

### 4. **DEPENDENT ENTITIES** (suportadoras)
```
Review.associate_id → Associate.id [ON DELETE: CASCADE]
Review.order_id → Order.id [ON DELETE: CASCADE]
Review.product_id → Product.id [ON DELETE: CASCADE]

WithdrawalRequest.associate_id → Associate.id [ON DELETE: CASCADE]

SupportTicket.associate_id → Associate.id [ON DELETE: CASCADE]
SupportTicket.order_id → Order.id [ON DELETE: CASCADE]

Notification.associate_id → Associate.id [ON DELETE: CASCADE]

ExternalLinkClick.associate_id → Associate.id [ON DELETE: CASCADE]

CardRequest.associate_id → Associate.id [ON DELETE: CASCADE]
CardSpendingProof.associate_id → Associate.id [ON DELETE: CASCADE]

AssociatePlacement.associate_id → Associate.id [ON DELETE: CASCADE]
AssociatePlacement.target_sponsor_id → Associate.id [ON DELETE: CASCADE]
```

## Implementação por Fases

### Fase 1: Limpeza (EXECUTADO)
- [x] `cleanupOrphanedData` - Remove todos os registros órfãos existentes
- [x] `auditOrphanedData` - Mapa completo de relacionamentos órfãos
- [x] `cleanupAllAssociatesData` - Cascade completo ao deletar associates

### Fase 2: Validação (EXECUTAR)
- [ ] Entity automations que validam FK antes de criar/atualizar
- [ ] Validações no frontend antes de submeter
- [ ] Funções de validação backend (`validateOrderIntegrity`, `validateAssociateIntegrity`)

### Fase 3: Restrições de Deleção
- [ ] Antes de permitir deletar Associate: verificar se tem orders, comissões
- [ ] Antes de permitir deletar Product: verificar se tem orders, reviews
- [ ] Antes de permitir deletar User: verificar se tem associates

### Fase 4: Automações de Cascade
- [ ] Order.delete → delete Reviews, delete Commissions relacionadas
- [ ] Associate.delete → delete todas as entidades dependentes (via cleanupAllAssociatesData)
- [ ] ShippingMethod.delete → validar se não há orders em uso

## Estratégia de Implementação

### Backend Validations (Entity Automations)
```javascript
// Ao criar Order
- Validar que associate_id existe
- Validar que product_id existe
- Validar que shipping_method_id existe

// Ao criar Commission
- Validar que beneficiary_id existe
- Validar que originator_id existe
- Validar que order_id existe

// Ao criar Associate
- Validar que user_id existe
- Validar que sponsor_id existe (e não cria ciclo)
- Validar contra auto-referência
```

### Deleção Segura
```javascript
// Ao deletar Associate
1. Verificar: Tem orders com status ≠ 'cancelled'?
   - SIM: Rejeitar ou marcar como 'inactive'
   - NÃO: Prosseguir
2. Deletar: Orders, Commissions, Reviews, etc. (CASCADE)
3. Deletar: Associate (LAST)

// Ao deletar Product
1. Verificar: Tem orders com status ≠ 'cancelled'?
   - SIM: Marcar como 'is_active=false'
   - NÃO: Deletar
```

## Queries de Auditoria Contínua

### Daily Audit
```
auditOrphanedData() - Identifica qualquer dado órfão novo
auditWalletIntegrity() - Valida saldo = earned - withdrawn
```

### Cleanup Automático
```
cleanupOrphanedData() - Remove órfãos encontrados
- Agendado: Diáriamente às 3:00 AM (América/Sao_Paulo)
```

## Checklist de Integridade

- [x] User → Associate validation
- [x] Associate → Sponsor validation (ciclos detectados)
- [x] Order → Associate/Product/ShippingMethod validation
- [x] Commission → Beneficiary/Originator/Order validation
- [x] Saldo = earned - withdrawn
- [x] Pontos não-negativos
- [x] Diretos = count(sponsor_id = this.id)
- [ ] Deleção de Associate é RESTRICT se tem orders ativos
- [ ] Deleção de Product é RESTRICT se tem orders
- [ ] Deleção de User é RESTRICT se tem associates

## Funções de Suporte

### Auditoria
- `auditOrphanedData()` - Mapa de todos os órfãos + recomendações FK
- `auditWalletIntegrity()` - Valida saldo, diretos, pontos
- `auditIntegrity()` - Validação geral de relacionamentos

### Limpeza
- `cleanupOrphanedData()` - Remove órfãos
- `cleanupAllAssociatesData()` - Deleta associate + cascade

### Validação
- `validateOrderIntegrity()` - Valida FKs antes de criar order
- `validateAssociateIntegrity()` - Valida FKs antes de criar/atualizar associate

## Status: EM IMPLEMENTAÇÃO
Próximo passo: Entity automations com validação de FK antes de create/update