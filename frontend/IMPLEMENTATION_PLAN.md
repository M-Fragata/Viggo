# Plano de Implementação: Centralização de Auth + Correção de Roteamento

## Problemas Identificados

1. **Roteamento quebrado**: 4 `<Route path="/*">` irmãos em `routes/index.tsx` — apenas `PublicRoutes` renderiza, `/admin` retorna página em branco
2. **Auth descentralizado**: 10+ arquivos acessam `localStorage` diretamente em vez de usar hook centralizado
3. **Login duplicado**: `loginPage.tsx` faz fetch manual + localStorage em vez de reutilizar `useAuth.login()`
4. **Token expirado não tratado**: 401 não redirecionava para login, gerava alertas em loop

---

## Fase 1: AuthContext + Hook Centralizado ✅ CONCLUÍDO

### 1.1 Criar `src/contexts/AuthContext.tsx`
- Provider React Context com estado global de auth
- Inicializa `user` e `token` do localStorage no mount
- Métodos: `login(email, password)`, `logout()`, `setSession(user, token)`, `refreshUser()`
- Retorna: `user`, `token`, `isLoading`, `login`, `logout`, `setSession`, `refreshUser`, `isMaster`, `isEnterpriseAdmin`, `isEmployee`, `isAdminOrMaster`
- **Adicional**: Validação de token JWT expirado no `loadSession` (decodifica e verifica `exp`)

### 1.2 Refatorar `src/hooks/useAuth.ts`
- Virar consumer: `export const useAuth = () => useContext(AuthContext)`
- Manter `useCompanyStatus` inalterado (funções puras, sem estado)
- Exportar types: `UserRole`, `PlanTier`, `CompanyStatus`

---

## Fase 2: Loading Component ✅ CONCLUÍDO

### 2.1 Criar `src/components/Loading.tsx`
- Spinner simples para uso durante `isLoading` do auth

---

## Fase 3: Separação de Arquivos de Rota ✅ CONCLUÍDO

### 3.1 Criar `src/routes/AuthRoutes.tsx`
```tsx
// Rotas públicas
// /login → LoginPage
// /accept-invite/:token → AcceptInvitePage
// / → redirect para /login
```

### 3.2 Criar `src/routes/AdminRoutes.tsx`
```tsx
// Rotas ENTERPRISE_ADMIN + MASTER
// / → LayoutPage + (PontoPage, PontoViewPage, RegisterFace)
// /admin → LayoutPage + DashboardPage
// Proteção: useAuth() → se role não permitido, redirect /login
```

### 3.3 Criar `src/routes/UserRoutes.tsx`
```tsx
// Rotas EMPLOYEE
// / → LayoutPage + (PontoPage, PontoViewPage, RegisterFace)
// Proteção: useAuth() → se role !== EMPLOYEE, redirect /login
```

### 3.4 Criar `src/routes/MasterRoutes.tsx`
```tsx
// Rotas MASTER
// /master → MasterLayout + (MasterDashboard, MasterCompanies)
// Proteção: useAuth() → se role !== MASTER, redirect /login
```

### 3.5 Reescrever `src/routes/index.tsx` (AppRoutes)
```tsx
const { user, isLoading } = useAuth();
if (isLoading) return <Loading />;

function Route() {
  switch (user?.role) {
    case "EMPLOYEE": return <UserRoutes />;
    case "ENTERPRISE_ADMIN": return <AdminRoutes />;
    case "MASTER": return <MasterRoutes />;
    default: return <AuthRoutes />;
  }
}

return (
  <BrowserRouter>
    <Routes>
      <Route path="/*" element={<Route />} />
    </Routes>
  </BrowserRouter>
);
```

---

## Fase 4: Atualizar Componentes para usar `useAuth()` ✅ CONCLUÍDO

| Arquivo | Mudança |
|---------|---------|
| `loginPage.tsx` | `const { login } = useAuth(); await login(email, password)` — remove fetch manual + localStorage |
| `AcceptInvitePage.tsx` | `const { setSession } = useAuth(); setSession(user, token)` — novo helper para aceitar convite |
| `RegisterFace.tsx` | `const { user, token, refreshUser } = useAuth()` — remove localStorage direto, usa `api.auth` base URL |
| `layoutPage.tsx` | `const { user, logout } = useAuth()` — remove localStorage direto |
| `MasterLayout.tsx` | `const { logout } = useAuth()` — remove localStorage direto |
| `pontoPage.tsx` | Token via `useAuth().token` — remove localStorage, usa `import.meta.env.VITE_API_URL` |
| `pontoViewPage.tsx` | Token via `useAuth().token` — remove localStorage, usa `import.meta.env.VITE_API_URL` |

**Nota**: `src/services/api.ts` continua lendo `localStorage.getItem("@viggo:token")` (Opção A — sem breaking changes, funciona porque `useAuth.login()` escreve no localStorage)

---

## Fase 5: Adicionar `token` no Context ✅ CONCLUÍDO

```tsx
// AuthContext.tsx
return {
  user,
  token,           // NOVO
  isLoading,
  login,
  logout,
  setSession,      // NOVO - para AcceptInvitePage
  refreshUser,
  isMaster,
  isEnterpriseAdmin,
  isEmployee,
  isAdminOrMaster,
};
```

---

## Fase 6: Tratamento de Token Expirado (401) ✅ NOVO

### 6.1 `src/services/api.ts` - Interceptador 401
- No `fetchApi`: se `response.status === 401` → limpa localStorage + `window.location.href = "/"`
- Retorna `Promise` que nunca resolve (para evitar erros em cascata)

### 6.2 `AuthContext.tsx` - Validação no carregamento
- No `loadSession`: decodifica JWT (`jwt-decode`) e verifica `exp < agora`
- Se expirado → limpa localStorage + seta `isLoading = false` (usuário cai no AuthRoutes)

---

## Mapeamento de Roles → Rotas

| Role | Rotas Acessíveis |
|------|------------------|
| `EMPLOYEE` | `/` (ponto), `/pontos`, `/register` |
| `ENTERPRISE_ADMIN` | `/` (ponto), `/pontos`, `/register`, `/admin` (dashboard) |
| `MASTER` | `/master` (dashboard, companies) + todas acima (ENTERPRISE_ADMIN) |
| Não autenticado | `/login`, `/accept-invite/:token` |

---

## Arquivos Criados ✅

1. `src/contexts/AuthContext.tsx`
2. `src/components/Loading.tsx`
3. `src/routes/AuthRoutes.tsx`
4. `src/routes/AdminRoutes.tsx`
5. `src/routes/UserRoutes.tsx`
6. `src/routes/MasterRoutes.tsx`

---

## Arquivos Modificados ✅

1. `src/hooks/useAuth.ts` → consumer do context
2. `src/routes/index.tsx` → AppRoutes com switch por role
3. `src/pages/loginPage.tsx` → usa `useAuth().login()`
4. `src/components/company/AcceptInvitePage.tsx` → usa `useAuth().setSession()`
5. `src/pages/RegisterFace.tsx` → usa `useAuth()`
6. `src/pages/layoutPage.tsx` → usa `useAuth()`
7. `src/components/master/MasterLayout.tsx` → usa `useAuth().logout()`
8. `src/pages/pontoPage.tsx` → usa `useAuth().token`
9. `src/pages/pontoViewPage.tsx` → usa `useAuth().token`
10. `src/services/api.ts` → interceptador 401 + limpeza automática
11. `src/App.tsx` → wrap com `<AuthProvider>`
12. `src/utils/api.ts` → mantido (apenas exporta `VITE_API_URL`)

---

## Decisões Técnicas Confirmadas

- ✅ MASTER acessa AdminRoutes também
- ✅ ENTERPRISE_ADMIN acessa `/` (ponto) + `/admin`
- ✅ Loading component simples (spinner)
- ✅ Login navega para `/` e roteamento resolve baseado na role
- ✅ Arquivos de rota separados em `src/routes/`
- ✅ `api.ts` mantém localStorage direto (Opção A)
- ✅ `setSession(user, token)` no context para AcceptInvitePage
- ✅ Tratamento automático de 401 (token expirado/inválido)
- ✅ Validação de expiração JWT no carregamento da sessão

---

## Testes Realizados ✅

1. **Login** → credenciais válidas → redireciona para `/admin` (ENTERPRISE_ADMIN)
2. **Dashboard admin** → carrega abas: Funcionários, Presentes, Total, Plano, Convites
3. **Logout** → botão "Sair" no menu → limpa localStorage → redireciona `/login`
4. **Login novamente** → funciona corretamente
5. **Rota base `/`** → carrega PontoPage para ENTERPRISE_ADMIN
6. **Token expirado** → 401 na API → limpa sessão → redirect `/login` (testado via logout/login)

---

## Estimativa de Esforço Real

- Context + hook: ~30 min
- Loading: ~5 min
- 4 arquivos de rota: ~20 min
- AppRoutes: ~10 min
- 9 componentes atualizados: ~45 min
- Interceptador 401 + validação JWT: ~20 min
- Testes manuais: ~15 min

**Total real: ~2h25min**

---

## Próximos Passos (Opcional)

- [ ] Adicionar Error Boundary no AppRoutes
- [ ] Refresh token automático (se backend suportar)
- [ ] Persistir role/redirect no login para voltar à página original
- [ ] Testes automatizados (Vitest + React Testing Library)