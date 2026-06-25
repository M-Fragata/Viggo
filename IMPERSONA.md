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

## Passo a Passo — Backend

### 1. `backend/src/middleware/AuditMiddleware.ts`
- Adicionar `IMPERSONATE: 'IMPERSONATE'` em `AUDIT_ACTIONS`

### 2. `backend/src/middleware/RateLimitMiddleware.ts`
- Criar `impersonateRateLimit` com `keyGenerator: (req) => req.user?.id || req.ip`
- `windowMs: 60000`, `max: 5`

### 3. `backend/src/controller/master/MasterController.ts`
- Novo método `async impersonate(req: Request, res: Response)`:
  - Validar `companyId` (Zod UUID)
  - Buscar empresa (status !== CANCELLED)
  - Buscar user alvo: 1º ENTERPRISE_ADMIN, senão 1º EMPLOYEE
  - Gerar token JWT com payload acima
  - `createAuditLog({ userId: masterId, companyId: targetCompanyId, action: 'IMPERSONATE', entity: 'User', entityId: targetUserId, newData: { targetCompanyId, targetCompanyName, targetUserId, targetUserRole }, ip, userAgent })`
  - Retornar `{ token, user: { id: targetUserId, name, email, role, companyId, companyName }, expiresIn: 3600 }`

### 4. `backend/src/routes/masterRoutes.ts`
- Adicionar rota:
```typescript
masterRoutes.post('/impersonate/:id', authMiddleware, requireMaster, impersonateRateLimit, masterController.impersonate);
```
- Importar `impersonateRateLimit` do middleware

---

## Passo a Passo — Frontend

### 5. `frontend/src/services/api.ts`
- Adicionar em `api.master`:
```typescript
impersonate: (companyId: string) =>
  fetchApi<{ token: string; user: User; expiresIn: number }>(`/master/impersonate/${companyId}`, {
    method: "POST",
  }),
```

### 6. `frontend/src/hooks/useMaster.ts`
- Adicionar em `useMasterActions`:
```typescript
const impersonate = useCallback(
  async (companyId: string, companyName: string) => {
    const result = await api.master.impersonate(companyId);
    return { ...result, companyName };
  },
  []
);
```

### 7. `frontend/src/contexts/AuthContext.tsx`
- Novos campos no estado/contexto:
```typescript
isImpersonated: boolean;
impersonatedCompanyName: string | null;
originalMasterToken: string | null;
originalMasterUser: User | null;
startImpersonation: (token: string, user: User, companyName: string) => void;
stopImpersonation: () => void;
```
- `startImpersonation`:
  - Salva token/user atuais em `originalMasterToken` / `originalMasterUser` (localStorage `@viggo:masterToken`, `@viggo:masterUser`)
  - Salva novo token/user nos keys padrão (`@viggo:token`, `@viggo:user`)
  - Seta `isImpersonated = true`, `impersonatedCompanyName`
- `stopImpersonation`:
  - Restaura master token/user do backup
  - Limpa backup
  - Seta `isImpersonated = false`, `impersonatedCompanyName = null`
  - `window.location.href = '/master/companies'`

### 8. `frontend/src/components/master/ImpersonationBanner.tsx` (NOVO)
- Componente fixo no topo (`position: fixed; top: 0; z-index: 9999`)
- Fundo âmbar/vermelho, texto: `⚠️ Modo Impersonação ativo — Você está como [Empresa X] (Master: [Seu Nome])`
- Botão "Sair da Impersonação" → chama `stopImpersonation()`

### 9. `frontend/src/components/master/MasterLayout.tsx`
- Importar e renderizar `<ImpersonationBanner />` condicional ao `isImpersonated`

### 10. `frontend/src/pages/MasterCompanies.tsx`
- No dropdown de ações (linha ~193-267), adicionar botão "Impersonar" (só se `isMaster`)
- `onClick` → chama `impersonate(company.id, company.name)` → `auth.startImpersonation(result.token, result.user, result.companyName)` → `window.location.href = '/admin'`

---

## Checklist de Validação

```bash
# Backend
cd backend && npm run build

# Frontend
cd frontend && npm run build && npm run lint
```

---

## Testes Manuais Sugeridos

1. **Master acessa `/master/companies`** → vê botão "Impersonar" em cada linha
2. **Clica "Impersonar"** → redireciona para `/admin` com banner visível
3. **Navega na empresa** → permissões de `ENTERPRISE_ADMIN` funcionam
4. **Clica "Sair da Impersonação"** → volta para `/master/companies` como Master
5. **Tenta acessar `/master/impersonate` sem ser Master** → 403
6. **Faz 6 requisições rápidas** → 5ª ok, 6ª retorna 429
7. **Verifica `AuditLog`** → registro com action `IMPERSONATE` e dados corretos
8. **Master faz logout** → sessão de impersonação expira (token 1h)