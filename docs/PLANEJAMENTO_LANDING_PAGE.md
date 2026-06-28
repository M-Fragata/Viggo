# Planejamento: Landing Page + Company Signup (Frontend Viggo)

## Contexto Atual

### Backend (✅ Pronto)
- `POST /companies/signup` - Cria empresa + admin (ENTERPRISE_ADMIN) + trial
- Validação Zod + CPF/CNPJ + bcrypt + JWT
- Retorna `{ user, company, token }`

### Frontend (✅ Parcial)
- `api.auth.signup()` já existe em `src/services/api.ts:58-63`
- Types `SignupCompanyDto` / `SignupCompanyResponse` definidos
- Padrão de forms: React Hook Form + Zod + `useActionState` (veja `loginPage.tsx`)
- Componentes base: `Input`, `Button`, `Loading`
- Roteamento por role em `src/routes/index.tsx` → `AuthRoutes` para não-autenticados

### Estrutura de Rotas Atual
```
/login                    → AuthRoutes (público)
/accept-invite/:token     → AuthRoutes (público)
/                         → Redireciona para /login (se não autenticado)
/admin/*                  → AdminRoutes (ENTERPRISE_ADMIN/MASTER)
/master/*                 → MasterRoutes (MASTER)
/*                        → UserRoutes (EMPLOYEE)
```

---

## Decisão: Landing Page no Mesmo Projeto ✅

**Motivos (resumo do AGENTS.md + análise):**
- Zero duplicação: Tailwind, ESLint, TS, components, hooks, api client, types
- Deploy único, CI/CD único, domain único
- Code-split da landing (`React.lazy`) → bundle do app autenticado não cresce
- Auth context compartilhado → redirect automático se logado acessar `/`

---

## Plano de Implementação

### 1. Nova Rota Pública: `/` (Landing Page)

**Arquivos a criar:**
```
frontend/src/pages/LandingPage.tsx          # Página pública, leve, sem AuthProvider
```

**Alterações em rotas:**
```tsx
// src/routes/AuthRoutes.tsx
export function AuthRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />        // NOVO - landing page
      <Route path="/login" element={<LoginPage />} />
      <Route path="/company/signup" element={<CompanySignupPage />} />  // NOVO
      <Route path="/accept-invite/:token" element={<AcceptInvitePage />} />
      // <Route path="/" element={<Navigate to="/login" replace />} />  // REMOVER
    </Routes>
  );
}
```

**LandingPage.tsx:**
- Hero section (headline, CTA "Criar conta grátis")
- Features/benefícios (3-4 cards)
- Footer simples
- `<Link to="/company/signup">` no CTA principal
- **Sem** `AuthProvider`, **sem** providers de auth → bundle leve
- Code-split: `const LandingPage = lazy(() => import('../pages/LandingPage'))`

---

### 2. Nova Página: `/company/signup` (CompanySignupPage)

**Arquivos a criar:**
```
frontend/src/pages/CompanySignupPage.tsx    # Form completo de cadastro empresa
```

**Campos (conforme `SignupCompanyDto` + backend):**
| Campo | Tipo | Validação |
|-------|------|-----------|
| name | string | min 3 |
| email | email | z.email() |
| cpf | string | min 11, validação CPF |
| cnpj | string? | opcional, validação CNPJ |
| companyName | string | min 2 |
| password | string | min 8 |
| confirmPassword | string | deve igualar password |

**Fluxo:**
1. Form submit → `api.auth.signup(data)`
2. Sucesso: `auth.login(user, token)` (já existe no `useAuth`) → redirect por role (`/admin`)
3. Erro: exibir `z.ZodError` issues + erros 400/500 do backend

**Reutilização:**
- Zod schema compartilhado (pode extrair para `src/schemas/companySignup.ts`)
- Componentes `Input`, `Button`, `Loading`
- Padrão `useActionState` igual ao `LoginPage`

---

### 3. Ajuste no AuthContext / useAuth

**Verificar se `login()` aceita token externo** (signup retorna token):
```ts
// src/hooks/useAuth.ts
async login(email, password) { ... }
// Adicionar:
async setAuth(user, token) { ... }  // para uso pós-signup
```

Ou no `CompanySignupPage`:
```ts
const { login } = useAuth();
// após signup:
await login(response.user.email, password); // reusa login para setar token/state
// ou chamar api.auth.login() manualmente
```

---

### 4. Code-Splitting (Performance)

```tsx
// src/routes/AuthRoutes.tsx
import { lazy, Suspense } from 'react';
import { Loading } from '../components/Loading';

const LandingPage = lazy(() => import('../pages/LandingPage'));
const CompanySignupPage = lazy(() => import('../pages/CompanySignupPage'));

// No JSX:
<Suspense fallback={<Loading />}>
  <Routes> ... </Routes>
</Suspense>
```

---

### 5. SEO / Meta Tags (Landing)

`index.html` já existe. Adicionar em `LandingPage.tsx`:
```tsx
useEffect(() => {
  document.title = 'Viggo - Controle de Ponto com Reconhecimento Facial';
  // meta description, og:tags, etc.
}, []);
```

---

## Checklist de Implementação

| Item | Arquivo | Status |
|------|---------|--------|
| Criar `LandingPage.tsx` | `src/pages/LandingPage.tsx` | ⬜ |
| Criar `CompanySignupPage.tsx` | `src/pages/CompanySignupPage.tsx` | ⬜ |
| Extrair schema Zod compartilhado | `src/schemas/companySignup.ts` | ⬜ |
| Atualizar `AuthRoutes.tsx` | adicionar rotas `/` e `/company/signup` | ⬜ |
| Ajustar `useAuth` para `setAuth` (se necessário) | `src/hooks/useAuth.ts` | ⬜ |
| Adicionar `lazy` + `Suspense` nas rotas | `src/routes/AuthRoutes.tsx` | ⬜ |
| Testar fluxo completo: landing → signup → login → /admin | - | ⬜ |
| `npm run build` + `npm run lint` no frontend | - | ⬜ |

---

## Estimativa de Esforço

| Etapa | Esforço |
|-------|---------|
| LandingPage (UI + copy) | ~2h |
| CompanySignupPage (form + validação + integração) | ~3h |
| Rotas + code-split + ajustes auth | ~1h |
| Testes manuais + lint/build | ~1h |
| **Total** | **~7h** |

---

## Próximos Passos

1. **Confirmar** se quer prosseguir com este plano
2. **Criar** os arquivos na ordem acima
3. **Testar** fluxo ponta-a-ponta com backend rodando

---

*Documento gerado em 2026-06-26 baseado na estrutura atual do Viggo (frontend React 19 + Vite, backend Express 5 + Prisma).*