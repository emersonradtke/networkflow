# Auditoria do App - Divergências e Erros Encontrados

## 🔴 ERROS CRÍTICOS

### 1. **Falta de campos novos na entidade Order**
- **Problema**: Os campos `scheduled_date` e `scheduled_time` foram adicionados ao `DeliveryManageModal` e `OrderDetailModal`, mas não existem na entidade `Order.json`
- **Impacto**: Os dados não serão salvos no banco de dados
- **Solução**: Adicionar campos à entidade

### 2. **Duplicação de shipping_cost no cálculo do pedido**
- **Arquivo**: `components/ShoppingCart.jsx` linha 160
- **Problema**: `amount: (item.price * item.qty) + shippingCost` calcula o total com frete para CADA item do carrinho
- **Exemplo**: Se carrinho tem 2 itens + frete R$10, cada item recebe +R$10 (total duplicado)
- **Solução**: O `amount` deve ser apenas `item.price * item.qty`. O frete deve ser registrado em `shipping_cost`

### 3. **Erro na agrupação de pedidos (AdminOrders)**
- **Arquivo**: `pages/admin/AdminOrders.jsx` linhas 49-50
- **Problema**: Cálculo incorreto do total do grupo:
  ```javascript
  // Atual (ERRADO):
  groups[key].total += (o.unit_price || o.amount || 0) * (o.quantity || 1);
  // Deveria ser:
  groups[key].total += (o.unit_price || 0) * (o.quantity || 1);
  ```
- **Impacto**: Totais dos pedidos aparecem duplicados ou incorretos no admin

### 4. **Shipping cost duplicado no DeliveryManageModal**
- **Arquivo**: `components/DeliveryManageModal.jsx`
- **Problema**: Campo `shipping_cost` pode ser editado, mas o modal não passa parametros de agendamento corretos
- **Impacto**: O agendamento não aparece no modal de entrega admin

## ⚠️ DIVERGÊNCIAS LÓGICAS

### 5. **Grupo de pedidos sem receber todos os campos**
- **Arquivo**: `pages/admin/AdminOrders.jsx` linhas 31-45
- **Problema**: Ao agrupar, os campos `scheduled_date` e `scheduled_time` não são propagados
- **Impacto**: Admin não vê agendamento no modal

### 6. **Falta de validação de quantidade em estoque**
- **Arquivo**: `components/ShoppingCart.jsx` linha 160
- **Problema**: Não valida se há estoque suficiente antes de criar o pedido
- **Solução**: Validar `item.stock >= item.qty`

### 7. **Inconsistência de status de entrega**
- **Problema**: Alguns pedidos aparecem com `delivery_status` mesmo quando estão em `pending` (pagamento)
- **Solução**: Mostrar delivery_status apenas quando `status === 'paid'`

## 📋 SUGESTÕES DE MELHORIAS

1. Adicionar confirmação antes de finalizar pedido com endereço incompleto
2. Adicionar log de mudanças no OrderEditModal (admin)
3. Validar CEP antes de salvar endereço
4. Implementar notificação quando agendamento for salvo