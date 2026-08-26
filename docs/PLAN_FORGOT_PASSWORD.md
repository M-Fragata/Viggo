# Plano: Sistema de Redefinição de Senha ("Esqueceu a senha?")

## Visão Geral

Implementar fluxo completo de redefinição de senha via código de 6 dígitos enviado por email, com validação de código, limite de tentativas e reenvio com cooldown.

---

## Fluxo do Usuário

```
Tela de Login
  └─ "Esqueceu a senha?"
       └─ Etapa 1: Informar email → Enviar código
            └─ Etapa 2: Digitar código de 6 dígitos → Validar
                 └─ Etapa 3: Nova senha + Confirmar senha → Redefinir
                      └─ Redireciona para o Login
```

---

## Etapas da Página

### Etapa 1 — Informar Email

- Campo de email + botão "Enviar código"
- Validação: email obrigatório e formato válido (Zod)
- Backend gera código, envia por email, retorna `{ email }`
- Transição para Etapa 2

### Etapa 2 — Digitar Código

- Texto: **"Digite o código enviado para o email {email}"**
- 6 inputs separados (auto-focus, auto-advance entre campos)
- Botão "Reenviar código" com cooldown de 2 minutos (só aparece após enviar o primeiro código)
- Texto: **"Tentativas: X/5"**
- Ao preencher os 6 dígitos, valida automaticamente no backend
- Se código inválido: incrementa tentativas, exibe erro com tentativas restantes
- Se 5 erros atingidos: exibe "Número máximo de tentativas atingido. Solicite um novo código"
- Se código correto: transição para Etapa 3

### Etapa 3 — Nova Senha

- Campos: "Nova senha" + "Confirmar senha"
- Validação: mínimo 6 caracteres, senhas coincidem (Zod)
- Botão "Redefinir senha"
- Sucesso → redireciona para `/` (login)

---

## Backend

### Schema Prisma — Model User

Adicionar 3 campos ao model `User`:

```prisma
model User {
  ...existing fields...
  resetCode          String?
  resetCodeExpiresAt DateTime?
  resetCodeAttempts  Int?       @default(0)
}
```

| Campo | Tipo | Descrição |
|---|---|---|
| `resetCode` | `String?` | Código de 6 dígitos armazenado como hash SHA-256 |
| `resetCodeExpiresAt` | `DateTime?` | Data/hora de expiração do código (10 minutos) |
| `resetCodeAttempts` | `Int?` | Número de tentativas erradas (padrão 0, máximo 5) |

### Variável de Ambiente

Adicionar ao `environment.ts`:

```typescript
RESEND_API_KEY: z.string()
```

### Dependência

```bash
npm install resend
```

### Endpoints

| Método | Rota | Body | Auth | Rate Limit | Descrição |
|---|---|---|---|---|---|
| `POST` | `/auth/forgot-password` | `{ email }` | Não | `authLimiter` | Gera código, envia email, reseta tentativas |
| `POST` | `/auth/verify-reset-code` | `{ email, code }` | Não | `authLimiter` | Valida código + tentativas, retorna JWT de reset |
| `POST` | `/auth/reset-password` | `{ token, password }` | Não | `authLimiter` | Atualiza senha, limpa campos de reset |

### Lógica dos Endpoints

#### `POST /auth/forgot-password`

1. Valida `{ email }` com Zod
2. Busca user por email
3. Se não existe → retorna sucesso por segurança ("Se o email existir...")
4. Gera código: `Math.random().toString().slice(2, 8)` (6 dígitos numéricos)
5. Armazena hash SHA-256: `crypto.createHash('sha256').update(code).digest('hex')`
6. Define `resetCodeExpiresAt`: `new Date(Date.now() + 10 * 60 * 1000)` (10 min)
7. Reseta `resetCodeAttempts` para 0
8. Envia email com o código via Resend
9. Retorna `{ email }` (email informado)

#### `POST /auth/verify-reset-code`

1. Valida `{ email, code }` com Zod
2. Busca user por email
3. Se não existe → erro 400
4. Se `resetCodeAttempts >= 5` → erro 400 "Número máximo de tentativas atingido"
5. Se `resetCodeExpiresAt < now` → erro 400 "Código expirado"
6. Compara hash SHA-256 do code informado com `user.resetCode`
7. Se diferente → incrementa `resetCodeAttempts`, retorna erro 400 "Código inválido. Tentativas: X/5"
8. Se correto → gera JWT de reset (expiração 5 min, payload: `{ userId, type: 'password-reset' }`)
9. Retorna `{ token }`

#### `POST /auth/reset-password`

1. Valida `{ token, password }` com Zod
2. Verifica JWT com `jwt.verify(token, JWT_SECRET)`
3. Se inválido ou expirado → erro 400
4. Busca user por id
5. Hash nova senha com bcrypt (cost 10)
6. Atualiza `password`, limpa `resetCode`, `resetCodeExpiresAt`, `resetCodeAttempts`
7. Retorna `{ message: "Senha redefinida com sucesso" }`

### Serviço de Email

Criar `backend/src/utils/email.ts`:

```typescript
import { Resend } from 'resend';
import { Env } from './environment.js';

const resend = new Resend(Env.RESEND_API_KEY);

export async function sendResetCodeEmail(to: string, code: string) {
  await resend.emails.send({
    from: 'Viggo <noreply@seu-dominio.com>',
    to: [to],
    subject: 'Código de redefinição de senha - Viggo',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #10b981;">Redefinição de Senha</h2>
        <p>Olá,</p>
        <p>Você solicitou a redefinição da sua senha. Utilize o código abaixo:</p>
        <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #059669;">${code}</span>
        </div>
        <p style="color: #6b7280; font-size: 14px;">Este código expira em 10 minutos.</p>
        <p style="color: #6b7280; font-size: 14px;">Se você não solicitou esta redefinição, ignore este email.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="color: #9ca3af; font-size: 12px;">Equipe Viggo</p>
      </div>
    `,
  });
}
```

### Arquivos Backend

| Arquivo | Ação |
|---|---|
| `backend/prisma/schema.prisma` | Adicionar 3 campos no model User |
| `backend/src/utils/environment.ts` | Adicionar `RESEND_API_KEY` |
| `backend/src/utils/email.ts` | **Novo** — serviço de envio de email via Resend |
| `backend/src/controller/ForgotPasswordController.ts` | **Novo** — 3 métodos (forgotPassword, verifyResetCode, resetPassword) |
| `backend/src/routes/authRoutes.ts` | Adicionar 3 rotas públicas |

---

## Frontend

### API — Métodos Novos

Adicionar em `frontend/src/services/api.ts`:

```typescript
auth: {
  ...existing methods...

  forgotPassword: (email: string) =>
    fetchApi<{ email: string }>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
      requiresAuth: false,
    }),

  verifyResetCode: (email: string, code: string) =>
    fetchApi<{ token: string }>("/auth/verify-reset-code", {
      method: "POST",
      body: JSON.stringify({ email, code }),
      requiresAuth: false,
    }),

  resetPassword: (token: string, password: string) =>
    fetchApi<{ message: string }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password }),
      requiresAuth: false,
    }),
},
```

### Página — ForgotPasswordPage.tsx

Criar `frontend/src/pages/ForgotPasswordPage.tsx` com 3 etapas:

**Estado da página:**

```typescript
type Step = 'email' | 'code' | 'password';

interface PageState {
  step: Step;
  email: string;
  token: string;
  attempts: number;
  maxAttempts: number;
  cooldown: number;
  message: string;
}
```

**Etapa 1 — Email:**
- Input email + botão "Enviar código"
- On submit → `api.auth.forgotPassword(email)` → avança para Etapa 2

**Etapa 2 — Código:**
- Texto: "Digite o código enviado para o email {email}"
- 6 inputs separados (auto-focus, auto-advance)
- Exibe "Tentativas: X/5"
- Botão "Reenviar código" com countdown de 2 minutos
- Ao completar 6 dígitos → `api.auth.verifyResetCode(email, code)`
- Sucesso → salva token, avança para Etapa 3
- Erro → incrementa tentativas, exibe mensagem
- Se 5 erros → desabilita inputs, exige reenvio

**Etapa 3 — Nova Senha:**
- Input "Nova senha" + "Confirmar senha" + botão "Redefinir"
- On submit → `api.auth.resetPassword(token, password)`
- Sucesso → redireciona para `/`

**Componentes utilizados:**
- `Input` (existente)
- `Button` (existente)
- `Link` do react-router
- `useNavigate` do react-router
- Estilos: TailwindCSS (tema emerald)

### Login Page — Atualização

Em `frontend/src/pages/loginPage.tsx`, trocar o link:

```diff
- <Link
-   to="/accept-invite"
-   className="text-center text-slate-600 hover:text-emerald-500 text-sm transition-colors"
- >
-   Recebeu um convite? Aceite aqui
- </Link>
+ <div className="flex justify-between items-center text-sm">
+   <Link
+     to="/accept-invite"
+     className="text-slate-600 hover:text-emerald-500 transition-colors"
+   >
+     Recebeu um convite? Aceite aqui
+   </Link>
+   <Link
+     to="/forgot-password"
+     className="text-slate-600 hover:text-emerald-500 transition-colors"
+   >
+     Esqueceu a senha?
+   </Link>
+ </div>
```

### Rotas — AuthRoutes.tsx

Adicionar lazy import e rota:

```tsx
const ForgotPasswordPage = lazy(() =>
  import("../pages/ForgotPasswordPage").then((m) => ({ default: m.ForgotPasswordPage }))
);

// Dentro do <Routes>:
<Route path="/forgot-password" element={<ForgotPasswordPage />} />
```

### Arquivos Frontend

| Arquivo | Ação |
|---|---|
| `frontend/src/services/api.ts` | Adicionar 3 métodos (forgotPassword, verifyResetCode, resetPassword) |
| `frontend/src/pages/ForgotPasswordPage.tsx` | **Novo** — página com 3 etapas |
| `frontend/src/pages/loginPage.tsx` | Trocar link "Recebeu um convite?" por layout com dois links |
| `frontend/src/routes/AuthRoutes.tsx` | Adicionar rota `/forgot-password` |

---

## Resumo de Arquivos

### Novos (3)

| Arquivo | Descrição |
|---|---|
| `backend/src/utils/email.ts` | Serviço de envio de email via Resend |
| `backend/src/controller/ForgotPasswordController.ts` | Controller com 3 métodos |
| `frontend/src/pages/ForgotPasswordPage.tsx` | Página de redefinição com 3 etapas |

### Modificados (5)

| Arquivo | Mudança |
|---|---|
| `backend/prisma/schema.prisma` | Adicionar 3 campos no model User |
| `backend/src/utils/environment.ts` | Adicionar `RESEND_API_KEY` |
| `backend/src/routes/authRoutes.ts` | Adicionar 3 rotas |
| `frontend/src/services/api.ts` | Adicionar 3 métodos |
| `frontend/src/pages/loginPage.tsx` | Trocar link |
| `frontend/src/routes/AuthRoutes.tsx` | Adicionar rota |

---

## Segurança

- Código armazenado como hash SHA-256 (não plaintext)
- Apenas o último código é válido (reenvio substitui o anterior)
- Expiração de 10 minutos no código
- JWT de reset com expiração curta (5 min)
- Máximo de 5 tentativas por código
- Rate limiting `authLimiter` em todos os endpoints (20 req/15 min)
- Mensagens genéricas para emails inexistentes (não revelar existência)

---

## Dependências

### Backend (nova)

```bash
npm install resend
```

### Variáveis de Ambiente

| Variável | Descrição | Obrigatória |
|---|---|---|
| `RESEND_API_KEY` | Chave da API Resend | Sim |

---

## Checklist de Implementação

- [ ] Schema Prisma: adicionar campos `resetCode`, `resetCodeExpiresAt`, `resetCodeAttempts`
- [ ] Migration: `npx prisma migrate dev`
- [ ] Environment: adicionar `RESEND_API_KEY`
- [ ] Backend: instalar `resend`
- [ ] Backend: criar `utils/email.ts`
- [ ] Backend: criar `controller/ForgotPasswordController.ts`
- [ ] Backend: adicionar rotas em `routes/authRoutes.ts`
- [ ] Frontend: adicionar métodos em `services/api.ts`
- [ ] Frontend: criar `pages/ForgotPasswordPage.tsx`
- [ ] Frontend: atualizar `pages/loginPage.tsx`
- [ ] Frontend: adicionar rota em `routes/AuthRoutes.tsx`
- [ ] Teste: fluxo completo (esqueci → código → redefinir → login)
- [ ] Teste: tentativas máximas (5 erros → bloqueio)
- [ ] Teste: reenvio com cooldown
- [ ] Teste: código expirado
