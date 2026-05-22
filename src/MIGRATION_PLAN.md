# Plano de Migração: Auth Legacy → Base44 Native Auth

## Status: FASE 1 - PREPARAÇÃO (Em andamento)

### Objetivo
Migrar de sistema de autenticação customizado (DirectUser + manual) para Base44 native auth de forma segura e sem quebras.

### Estrutura Atual (Legacy)
- `DirectUser` entity: usuários com username/password_hash/role/cpf
- `AuthContext`: checa sessionStorage primeiro, depois Base44
- Funções: `loginWithCredentials`, `createDirectUser`, `updateUserPassword`
- Login manual na Landing page

### Nova Estrutura (Base44 Native)
- Usar `base44.auth.me()` para autenticação
- Usar `base44.users.inviteUser(email, role)` para criar usuários
- Usar Base44 User entity com native roles
- Usar RLS policies para acesso a dados

### Fases de Migração

#### FASE 1: Preparação (Semana 1)
- [x] Documentar arquitetura atual
- [ ] Criar novos backend functions que suportam ambos os sistemas
- [ ] Atualizar AuthContext para priorizar Base44 native
- [ ] Criar script de migração de dados
- **Status:** Iniciando

#### FASE 2: Suporte Dual (Semana 2)
- [ ] DirectUser e Base44 User coexistem
- [ ] Novos registros vão para Base44
- [ ] Login funciona com ambos os sistemas
- [ ] Dados sincronizados entre sistemas

#### FASE 3: Migração Gradual (Semana 3-4)
- [ ] Migrar usuários ativos para Base44
- [ ] Manter compatibilidade retroativa
- [ ] Testar todas as funcionalidades
- [ ] Usuários precisam trocar senha (via Base44)

#### FASE 4: Remoção do Legacy (Semana 5)
- [ ] Remover DirectUser entity
- [ ] Remover session storage login
- [ ] Remover funções customizadas de auth
- [ ] Remover manejo de passwords legacy

### Mudanças por Fase

#### FASE 1 Changeset
1. Criar `AuthContext` v2 que suporta ambos
2. Criar `migrateUserToBase44` backend function
3. Criar `getOrCreateBase44User` backend function
4. Criar `syncAssociateWithUser` backend function
5. Documentar RLS policies necessárias
6. Documentar mapping de roles

#### Mapping de Roles
- DirectUser.role = 'user' → User.role = 'associate'
- DirectUser.role = 'admin' → User.role = 'admin'

### Riscos & Mitigação
| Risco | Mitigação |
|-------|-----------|
| Usuários perdem acesso | Ambos sistemas rodando em paralelo |
| Dados duplicados | Script de sincronização bidirecional |
| Perdida de histórico | Manter DirectUser para audit, não deletar |
| Quebra de RLS | Testar RLS policies antes de migrar |

### Rollback Plan
Se tudo quebrar, volta 100% para o estado anterior em < 5 min
- DirectUser funciona normalmente
- sessionStorage login intacto
- Nenhuma mudança em banco

---

## Próximo Passo
Executar FASE 1: Criar backend functions de suporte dual