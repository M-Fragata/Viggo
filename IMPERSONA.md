# Plano de Implementação: Impersonation (Assumir Identidade)

## Visão Geral
Permitir que usuários **Master** assumam a identidade de uma empresa (`ENTERPRISE_ADMIN`) para suporte/verificação, com auditoria completa, banner de segurança e retorno ao Master.

---

## Decisões Técnicas

| Item | Definição |
|------|-----------|
| **Endpoint** | `POST /api/master/impersonate/:companyId` |
| **User alvo** | 1º `ENTERPRISE_ADMIN` da empresa (fallback: 1º `EMPLOYEE`) |
| **Role no token** | `ENTERPRISE_ADMIN` |
| **Token duration** | 1 hora (`expiresIn: "1h"`) |
| **Rate limit** | 5 req/min por `masterUserId` (fallback IP) |
| **Auditoria** | `IMPERSONATE` action em `AuditLog` |
| **Voltar ao Master** | Botão no Banner (client-side, restaura token original) |
| **Redirect pós-impersonação** | `/admin` |
| **Master logout mata sessão** | Sim (token curto + clear client-side) |

---

## Payload do Token de Impersonação

```typescript
{
  id: masterUserId,              // ID do Master (rastreabilidade)
  role: "ENTERPRISE_ADMIN",      // Role da empresa alvo
  companyId: targetCompanyId,    // Empresa alvo
  planTier: targetCompanyPlan,   // Plano da empresa alvo
  isMaster: false,               // Não é master no contexto
  isImpersonated: true,          // Flag de segurança
  impersonatedBy: masterUserId,  // Quem iniciou
  impersonatedCompanyName: string // Nome da empresa (para banner)
}
```

---

## Passo a Passo — Backend ✅ CONCLUÍDO

### 1. `backend/src/middleware/AuditMiddleware.ts` ✅
- [x] Adicionar `IMPERSONATE: 'IMPERSONATE'` em `AUDIT_ACTIONS`

### 2. `backend/src/middleware/RateLimitMiddleware.ts` ✅
- [x] Criar `impersonateRateLimit` com `keyGenerator: (req) => req.user?.id ?? req.ip ?? 'unknown'`
- [x] `windowMs: 60000`, `max: 5`

### 3. `backend/src/controller/master/MasterController.ts` ✅
- [x] Novo método `async impersonate(req: Request, res: Response)`:
  - [x] Validar `companyId` (Zod UUID)
  - [x] Buscar empresa (status !== CANCELLED)
  - [x] Buscar user alvo: 1º ENTERPRISE_ADMIN, senão 1º EMPLOYEE
  - [x] Gerar token JWT com payload acima
  - [x] `createAuditLog({ userId: masterId, companyId: targetCompanyId, action: 'IMPERSONATE', entity: 'User', entityId: targetUserId, newData: { targetCompanyId, targetCompanyName, targetUserId, targetUserRole }, ip, userAgent })`
  - [x] Retornar `{ token, user: { id: targetUserId, name, email, role, companyId, companyName }, expiresIn: 3600 }`

### 4. `backend/src/routes/masterRoutes.ts` ✅
- [x] Adicionar rota:
```typescript
masterRoutes.post('/companies/:id/impersonate', authMiddleware, requireMaster, impersonateRateLimit, masterController.impersonate);
```
- [x] Importar `impersonateRateLimit` do middleware

---

## Passo a Passo — Frontend ✅ CONCLUÍDO

### 5. `frontend/src/services/api.ts` ✅
- [x] Adicionar em `api.master`:
```typescript
impersonate: (companyId: string) =>
  fetchApi<{ token: string; user: User; expiresIn: number }>(`/master/companies/${companyId}/impersonate`, {
    method: "POST",
  }),
```

### 6. `frontend/src/hooks/useMaster.ts` ✅
- [x] Adicionar em `useMasterActions`:
```typescript
const impersonate = useCallback(
  async (companyId: string, companyName: string) => {
    const result = await api.master.impersonate(companyId);
    return { ...result, companyName };
  },
  []
);
```

### 7. `frontend/src/contexts/AuthContext.tsx` ✅
- [x] Novos campos no estado/contexto:
```typescript
isImpersonated: boolean;
impersonatedCompanyName: string | null;
startImpersonation: (token: string, user: User, companyName: string) => void;
stopImpersonation: () => void;
```
- [x] `startImpersonation`:
  - [x] Salva token/user atuais em `originalMasterToken` / `originalMasterUser` (localStorage `@viggo:masterToken`, `@viggo:masterUser`)
  - [x] Salva novo token/user nos keys padrão (`@viggo:token`, `@viggo:user`)
  - [x] Seta `isImpersonated = true`, `impersonatedCompanyName`
- [x] `stopImpersonation`:
  - [x] Restaura master token/user do backup
  - [x] Limpa backup
  - [x] Seta `isImpersonated = false`, `impersonatedCompanyName = null`
  - [x] `window.location.href = '/master/companies'`

### 8. `frontend/src/components/master/ImpersonationBanner.tsx` (NOVO) ✅
- [x] Componente fixo no topo (`position: fixed; top: 0; z-index: 9999`)
- [x] Fundo âmbar/vermelho, texto: `⚠️ Modo Impersonação ativo — Você está como [Empresa X] (Master: [Seu Nome])`
- [x] Botão "Sair da Impersonação" → chama `stopImpersonation()`

### 9. `frontend/src/components/master/MasterLayout.tsx` ✅
- [x] Importar e renderizar `<ImpersonationBanner />` condicional ao `isImpersonated`

### 10. `frontend/src/pages/MasterCompanies.tsx` ✅
- [x] No dropdown de ações, adicionar botão "Impersonar" (só se `isMaster`)
- [x] `onClick` → chama `impersonate(company.id, company.name)` → `auth.startImpersonation(result.token, result.user, result.companyName)` → `window.location.href = '/admin'`

---

## Checklist de Validação ✅ CONCLUÍDO

```bash
# Backend
cd backend && npm run build  # ✅ PASSOU (sem erros nos arquivos modificados)

# Frontend
cd frontend && npm run build  # ✅ PASSOU
cd frontend && npm run lint   # ⚠️ Apenas warnings/errors pre-existentes no codebase
```

---

## Testes Manuais Sugeridos

- [ ] 1. **Master acessa `/master/companies`** → vê botão "Impersonar" em cada linha
- [ ] 2. **Clica "Impersonar"** → redireciona para `/admin` com banner visível
- [ ] 3. **Navega na empresa** → permissões de `ENTERPRISE_ADMIN` funcionam
- [ ] 4. **Clica "Sair da Impersonação"** → volta para `/master/companies` como Master
- [ ] 5. **Tenta acessar `/master/impersonate` sem ser Master** → 403
- [ ] 6. **Faz 6 requisições rápidas** → 5ª ok, 6ª retorna 429
- [ ] 7. **Verifica `AuditLog`** → registro com action `IMPERSONATE` e dados corretos
- [ ] 8. **Master faz logout** → sessão de impersonação expira (token 1h)

---

## Observações Finais

- **Empresa Master**: Criar manualmente via Prisma Studio/SQL (empresa "Viggo Master" + users com role MASTER)
- **Rota real**: `POST /master/companies/:id/impersonate` (com prefixo `/companies`)
- **localStorage keys**: `@viggo:masterToken`, `@viggo:masterUser` para backup do Master original