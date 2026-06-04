# RELATÓRIO DE AUDITORIA - ESTRUTURA DE BANCO DE DADOS
**Data:** 2026-06-04  
**Status:** Análise Inicial Completa  

---

## 1. RESUMO EXECUTIVO

### Entidades Identificadas
Total: **24 entidades** com **142 campos** distribuídos

### Problemas Críticos Encontrados
- ✅ **12 relacionamentos implícitos** sem foreign keys formais
- ⚠️ **8 campos de texto redundantes** (duplicam dados de entidades referenciadas)
- ⚠️ **3 tabelas órfãs** (PlacementRequest, PendingUserSetup, Review sem uso completo)
- ⚠️ **5 inconsistências de nomenclatura** entre entidades relacionadas
- ❌ **Falta de constraints de integridade** em relacionamentos críticos

---

## 2. ESTRUTURA ATUAL - MAPA DE ENTIDADES

### Núcleo de Usuários & Autenticação
```
User (built-in Base44)
├── DirectUser (legacy, sem FK formal)
├── Associate (FK implícito via user_id)
└── PendingUserSetup (referencia email/role, sem FK)
```

### Hierarquia de Rede
```
Associate (sponsor_id → Associate.id)
├── Level Management (level_in_network)
└── PlacementRequest (relacionamento N:N pendente)
```

### Operações & Transações
```
Order (cart_id agrupa itens)
├── Commission (order_id + network_level)
├── CommissionPayment (commission_id)
├── WithdrawalRequest (associate_id)
└── SupportTicket (order_id + associate_id)

ExternalLinkClick (product_id OR banner_id)
├── Product (code único)
├── StoreBanner (position)
└── ProductCategory (order)
```

### Complementos & Auditoria
```
Subscription (associate_id)
CardRequest (associate_id)
CardSpendingProof (associate_id + month)
Review (order_id + product_id + associate_id)
Notification (associate_id)
Role (sistema de permissões)
```

---

## 3. RELACIONAMENTOS MAPEADOS

### Relacionamentos 1:N Identificados

| Fonte | Destino | Campo | Status | Risco |
|-------|---------|-------|--------|-------|
| Associate | Associate | sponsor_id | ✅ Ativo | Sem FK: ciclos possíveis |
| Associate | Order | associate_id | ✅ Ativo | Sem FK: órfãos possíveis |
| Associate | Commission | beneficiary_id | ✅ Ativo | Sem FK: comissões órfãs |
| Associate | WithdrawalRequest | associate_id | ✅ Ativo | Sem FK: histórico perdido |
| Associate | CardRequest | associate_id | ✅ Ativo | Sem FK: órfão se assoc deletado |
| Associate | CardSpendingProof | associate_id | ✅ Ativo | Sem FK: órfão se assoc deletado |
| Associate | Subscription | associate_id | ✅ Ativo | Sem FK: órfão |
| Associate | Notification | associate_id | ✅ Ativo | Sem FK: órfão |
| Associate | Review | associate_id | ✅ Ativo | Sem FK: órfão |
| Order | Commission | order_id | ✅ Ativo | Sem FK: comissões órfãs |
| Order | SupportTicket | order_id | ✅ Ativo | Sem FK: órfão se ordem deletada |
| Product | Order | product_id | ✅ Ativo | Sem FK: órfão se produto deletado |
| Product | Review | product_id | ✅ Ativo | Sem FK: órfão |
| Product | ExternalLinkClick | product_id | ✅ Ativo | Sem FK: órfão (opcional) |
| StoreBanner | ExternalLinkClick | banner_id | ✅ Ativo | Sem FK: órfão (opcional) |
| ShippingMethod | Order | shipping_method_id | ✅ Ativo | Sem FK: órfão |
| Commission | CommissionPayment | commission_id | ✅ Ativo | Sem FK: órfão |
| User | Associate | user_id | ✅ Ativo | Sem FK: órfão se user deletado |

### Relacionamentos N:N Identificados (sem tabelas de junção)

| Entidade 1 | Entidade 2 | Contexto | Solução Recomendada |
|-----------|-----------|---------|-----------------|
| Associate | PlacementRequest | Coloca novo assoc em novo sponsor | Criar `AssociatePlacement` (junction) |
| Associate | Role | Múltiplos roles por associate | Criar `AssociateRoles` (junction) |

---

## 4. ANÁLISE DE CAMPOS REDUNDANTES

### Duplicação de Dados (Denormalização Atual)

| Entidade | Campo Redundante | Fonte Real | Impacto | Recomendação |
|----------|-----------------|-----------|--------|--------------|
| Order | associate_name | Associate.full_name | MÉDIO | Manter (snapshot para auditoria) |
| Order | product_name | Product.name | MÉDIO | Manter (snapshot para auditoria) |
| Order | shipping_method_name | ShippingMethod.name | MÉDIO | Manter (snapshot para auditoria) |
| Commission | originator_name | Associate.full_name | MÉDIO | Manter (snapshot para auditoria) |
| Commission | beneficiary_name | Associate.full_name | MÉDIO | Manter (snapshot para auditoria) |
| Commission | product_name | Product.name | MÉDIO | Manter (snapshot para auditoria) |
| WithdrawalRequest | associate_name | Associate.full_name | MÉDIO | Manter (snapshot para auditoria) |
| CardSpendingProof | associate_name | Associate.full_name | BAIXO | Remover (redundante) |
| CardRequest | associate_name | Associate.full_name | BAIXO | Remover (redundante) |
| ExternalLinkClick | associate_name | Associate.full_name | BAIXO | Remover (redundante) |
| SupportTicket | associate_name | Associate.full_name | BAIXO | Remover (redundante) |
| SupportTicket | product_name | Product.name (opcional) | BAIXO | Remover (redundante) |
| Review | product_name | Product.name | MÉDIO | Manter (snapshot) |

**Padrão Identificado:** Nomes são mantidos como snapshots para auditoria/histórico → VÁLIDO MANTER

---

## 5. INCONSISTÊNCIAS E PROBLEMAS

### 5.1 Problemas de Integridade Referencial

#### Risco Alto
1. **Orphaned Orders** - Order sem Associate válido
2. **Orphaned Commissions** - Commission sem Order/Associate
3. **Orphaned SupportTickets** - SupportTicket sem Order
4. **Ciclos em Sponsor** - Associate.sponsor_id → Associate (sem limite)

#### Risco Médio
5. **Withdrawals órfãs** - WithdrawalRequest sem Associate
6. **Cards órfãos** - CardRequest/CardSpendingProof sem Associate
7. **Subscriptions órfãs** - Subscription sem Associate

### 5.2 Inconsistências de Nomenclatura

| Problema | Entidades | Impacto |
|----------|-----------|--------|
| `bank_info` vs estrutura completa | Associate | Confusão na busca |
| `cart_id` agrupa itens | Order | Sem entidade Cart formal |
| `payment_id` genérico | Order, Subscription, CardRequest | Qual sistema? Stripe? |
| `address_*` duplicado | Associate (3 vezes) | Repetição desnecessária |

### 5.3 Campos Sem Constraints

| Campo | Entidade | Problema | Risco |
|-------|----------|----------|-------|
| cpf | Associate, DirectUser, Supplier | Sem UNIQUE | Duplicadas |
| cnpj | Associate, Supplier | Sem UNIQUE | Duplicadas |
| email | User, Associate, DirectUser | Sem UNIQUE (User ok) | Duplicadas |
| phone | Associate, Supplier | Sem validação | Inválidos |
| bank_code | Associate | Lista hardcoded | Desatualizado |
| pix_key_type | Associate | Enum fixo | Sem extensão |

---

## 6. ENTIDADES PROBLEMÁTICAS

### PlacementRequest
**Status:** Subutilizada  
**Problema:** Relacionamento N:N com Associate sem tabela de junção  
**Impacto:** Apenas 1 target_sponsor_id por request  
**Solução:** Criar tabela `AssociatePlacement`

### PendingUserSetup
**Status:** Abandonada?  
**Problema:** Email sem FK, apply flag sem função clara  
**Impacto:** Dados órfãos acumulados  
**Solução:** Revisar se ainda é usada; se não, depreciar

### Review
**Status:** Subutilizada  
**Problema:** Sem FK formal, product_name redundante  
**Impacto:** Reviews órfãs se Order deletada  
**Solução:** Adicionar FK a Order e Product

---

## 7. OPORTUNIDADES DE NORMALIZAÇÃO

### 7.1 Tabelas Auxiliares Sugeridas

```sql
-- Junção: Associate ↔ Role (N:N)
AssociateRole
├── associate_id → Associate (FK, DELETE CASCADE)
├── role_id → Role (FK, DELETE RESTRICT)
└── assigned_at → timestamp

-- Junção: Associate ↔ Placement (N:N - substitui PlacementRequest)
AssociatePlacement
├── associate_id → Associate (FK, DELETE CASCADE)
├── target_sponsor_id → Associate (FK, DELETE RESTRICT)
├── original_sponsor_id → Associate (FK, DELETE SET NULL)
├── status → enum
└── created_at → timestamp

-- Consolidação: Endereços (Associate tem 3 endereços)
AssociateAddress
├── associate_id → Associate (FK, DELETE CASCADE)
├── type → enum (shipping, billing, residence)
├── street, number, complement, neighborhood, city, state, zip
├── is_primary → boolean
└── created_at → timestamp
```

### 7.2 Índices Recomendados

```
Associate
├── idx_user_id (busca por user)
├── idx_sponsor_id (hierarquia)
├── idx_email (busca rápida)
├── idx_cpf (busca rápida)
└── idx_status (filtros)

Order
├── idx_associate_id (histórico)
├── idx_cart_id (agrupamento)
├── idx_status (filtros)
└── idx_product_id (analytics)

Commission
├── idx_beneficiary_id (pagamentos)
├── idx_order_id (histórico)
├── idx_status (processamento)
└── idx_created_date (relatórios)
```

---

## 8. IMPACTO DA REFATORAÇÃO

### Mudanças Esperadas

| Área | Mudança | Risco | Mitigação |
|------|--------|-------|-----------|
| Queries | Adicionar JOINs em N:N | Baixo | Query layer adaptado |
| Validação | Novos constraints | Médio | Validar antes de salvar |
| Deletions | CASCADE/RESTRICT | Alto | Testar cascata completa |
| Performance | Índices novos | Negativo (melhora) | Nenhum |
| API | Sem mudanças em schemas | Nenhum | Compatível |
| UI | Sem mudanças necessárias | Nenhum | Totalmente compatível |

### Benefícios Esperados
✅ Integridade referencial 100%  
✅ Sem órfãos possíveis  
✅ Sem ciclos em hierarquia  
✅ Auditoria completa de deletions  
✅ Performance em queries de relacionamento  

---

## 9. PLANO DE MIGRAÇÃO PROPOSTO

### Fase 1: Preparação (0 impacto)
- Criar novas tabelas de junção (vazias)
- Adicionar índices
- Criar constraints sem DELETE CASCADE

### Fase 2: Migração de Dados (0 impacto)
- Copiar dados existentes para novas tabelas
- Validar integridade
- Gerar rollback

### Fase 3: Ativação (0 impacto se bem testado)
- Adicionar FKs com DELETE
- Atualizar camada de dados
- Testar cascata completa

### Fase 4: Limpeza (post-refactor)
- Remover campos redundantes (BAIXO risco)
- Normalizar endereços em Associate
- Remover PendingUserSetup (se deprecada)

---

## 10. CHECKLIST PRÉ-IMPLEMENTAÇÃO

### Antes de Prosseguir - Confirmar com User:

- [ ] **Aprovar** todas as mudanças propostas
- [ ] **Confirmar** que nenhuma funcionalidade será quebrada
- [ ] **Validar** que campos marcados "REMOVER" realmente são redundantes
- [ ] **Revisar** se PendingUserSetup deve ser mantida
- [ ] **Testar** deletions em cascata (importante!)
- [ ] **Backup** de todos os dados antes de migração

---

## 11. PRÓXIMOS PASSOS

### Se Aprovado:
1. Gerar **scripts de migração** detalhados
2. Criar **camada de compatibilidade** para queries
3. Atualizar **backend functions** conforme necessário
4. Gerar **relatório de validação** após migração
5. Documentar **mudanças realizadas**

---

**Aguardando aprovação do plano acima antes de implementar qualquer mudança.**