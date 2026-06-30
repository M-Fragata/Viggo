# Relatório de Auditoria de Segurança — Viggo

**Data:** 30 de Junho de 2026
**Auditor:** AppSec Senior / Code Review Automation
**Escopo:** Backend (Express + Prisma), Frontend (React + Vite), CI/CD (GitHub Actions), Infraestrutura (Docker)
**Padrões de Referência:** OWASP Top 10 (2021), SANS Top 25, CWE

---

## 1. RESUMO EXECUTIVO

| ID | Vulnerabilidade | Severidade | Prioridade | Status |
|:---|:---|:---|:---|:---|
| SEC-01 | Token JWT sobrescrito com nome da empresa | Crítica | Imediata | |
| SEC-02 | Rotas de criação e atualização de usuário sem autenticação | Crítica | Imediata | |
| SEC-07 | XSS via template literals na janela de impressão | Crítica | Imediata | |
| SEC-08 | Credenciais PostgreSQL hardcoded no Docker | Crítica | Imediata | |
| SEC-09 | Credenciais Grafana hardcoded no Docker | Crítica | Imediata | |
| SEC-10 | Grafana com porta exposta + admin/admin | Crítica | Imediata | |
| SEC-14 | Face descriptor retornado ao client (dados biométricos) | Alta | Alta | ⚠️ DECISÃO |
| SEC-15 | Face descriptor retornado no checkin | Alta | Alta | ⚠️ DECISÃO |
| SEC-16 | Código de empresa hardcoded ("1") | Alta | Alta | |
| SEC-17 | Tokens JWT armazenados em localStorage | Alta | Alta | |
| SEC-18 | JSON.parse sem try-catch no localStorage | Alta | Alta | ✅ |
| SEC-19 | Verificação de rotas apenas no cliente | Alta | Alta | ✅ |
| SEC-20 | Token JWT exposto em React Context global | Alta | Alta | |
| SEC-21 | Impersonation com restauração de token pelo cliente | Alta | Alta | |
| SEC-22 | Testes e lint ignorados com `\|\| true` no CI/CD | Alta | Alta | |
| SEC-23 | Ausência de SAST/dependency scanning no CI/CD | Alta | Alta | |
| SEC-24 | PostgreSQL com porta exposta externamente | Alta | Alta | |
| SEC-25 | Prometheus com porta exposta sem autenticação | Alta | Alta | |
| SEC-26 | `--web.enable-lifecycle` no Prometheus | Alta | Alta | |
| SEC-27 | Containers rodando como root | Alta | Alta | |
| SEC-28 | node-exporter com acesso a `/proc`, `/sys`, `/` | Alta | Alta | |
| SEC-29 | cadvisor com acesso ao Docker e filesystem | Alta | Alta | |
| SEC-30 | Prometheus sem autenticação HTTP | Alta | Alta | |
| SEC-31 | Ausência de security headers (helmet) | Média | Média | |
| SEC-32 | Ausência de proteção CSRF | Média | Média | |
| SEC-33 | CORS sem credentials e sem maxAge | Média | Média | |
| SEC-34 | Rate limiter ausente na criação de conta | Média | Média | |
| SEC-35 | Logging excessivo de dados sensíveis | Média | Média | |
| SEC-36 | Senha com mínimo de 6 caracteres | Média | Média | |
| SEC-37 | Entropia fraca no JWT_SECRET (.env-example) | Média | Média | |
| SEC-38 | Endpoint `/metrics` sem autenticação | Média | Média | |
| SEC-39 | Race condition na validação de convite | Média | Média | |
| SEC-40 | Senha removida via destructuring mas objeto original em memória | Média | Média | ✅ |
| SEC-41 | `as any` no CheckinQuery suprime erros de tipo | Média | Média | ✅ |
| SEC-42 | Plan middleware depende de `req.planInfo` sem injeção prévia | Média | Média | |
| SEC-43 | Audit middleware silencia falhas | Média | Média | |
| SEC-44 | Fetch de URL da API com fallback para localhost | Média | Média | |
| SEC-45 | Variável VITE exposta no build | Média | Média | |
| SEC-46 | Modelos de ML faciais servidos estaticamente | Média | Média | |
| SEC-47 | Race condition na validação facial | Média | Média | |
| SEC-48 | CSRF ausente no frontend | Média | Média | |
| SEC-49 | Força bruta sem proteção no login | Média | Média | |
| SEC-50 | CPF enviado em texto plano | Média | Média | |
| SEC-51 | Face descriptor enviado sem criptografia | Média | Média | |
| SEC-52 | Ausência de CSP no index.html | Média | Média | |
| SEC-53 | Deploy via SSH sem verificação de integridade | Média | Média | |
| SEC-54 | YAML malformado (deploy job duplicado) | Média | Média | |
| SEC-55 | Tags `latest` em imagens Docker | Média | Média | |
| SEC-56 | Containers sem `read_only: true` | Média | Média | |
| SEC-57 | Containers sem `security_opt` ou `cap_drop` | Média | Média | |
| SEC-58 | Datasource Grafana→Prometheus sem autenticação | Média | Média | |
| SEC-59 | User role exposta no retorno de erro | Baixa | Baixa | |
| SEC-60 | Health check expõe mensagens de erro | Baixa | Baixa | |
| SEC-61 | Ausência de `permissions` no workflow CI/CD | Média | Média | |
| SEC-62 | Ausência de `timeout-minutes` nos jobs | Baixa | Baixa | |
| SEC-63 | Containers sem healthchecks | Baixa | Baixa | |
| SEC-64 | `external_labels` hardcoded no Prometheus | Baixa | Baixa | |
| SEC-65 | Preços hardcoded no shared/plans.ts | Baixa | Baixa | |
| SEC-66 | Redirecionamento baseado em resposta 403 | Baixa | Baixa | |
| SEC-67 | Token de convite na URL (leak via Referer) | Baixa | Baixa | |
| SEC-68 | Coordenadas em href sem validação | Baixa | Baixa | |

---

## 2. DETALHAMENTO TÉCNICO

---

### SEC-01 — Token JWT Sobrescrito com Nome da Empresa

> **Severidade:** Crítica | **Prioridade:** Imediata

- **O Problema:** A linha 120 chama `localStorage.setItem("@viggo:token", newCompany)` — a segunda chamada sobrescreve a primeira (linha 119), gravando o **nome da empresa** no lugar do JWT token. Isso destrói a sessão de autenticação e a aplicação pode falhar ou ficar em estado inválido.
- **A Mudança Necessária:** Corrigir a chave do localStorage para `@viggo:company`.

**Código Vulnerável:**
```typescript
// frontend/src/contexts/AuthContext.tsx:118-120
const setSession = useCallback((newUser: User, newToken: string, newCompany: string) => {
    localStorage.setItem("@viggo:user", JSON.stringify(newUser));
    localStorage.setItem("@viggo:token", newToken);
    localStorage.setItem("@viggo:token", newCompany); // ← BUG: sobrescreve o token
    setUser(newUser);
    setToken(newToken);
    setCompany(newCompany)
  }, []);
```

**Código Corrigido:**
```typescript
localStorage.setItem("@viggo:company", newCompany);
```

**CWE:** CWE-327 / CWE-693

---

### SEC-02 — Rotas de Criação e Atualização de Usuário sem Autenticação

> **Severidade:** Crítica | **Prioridade:** Imediata

- **O Problema:** As rotas `POST /sessions` (criação de usuário) e `PUT /sessions/:userId` (atualização de faceDescriptor) são públicas. Qualquer pessoa pode criar contas e **registrar faces arbitrárias em qualquer `userId`**, permitindo account takeover e bypass de autenticação facial.
- **A Mudança Necessária:** A rota `PUT /:userId` DEVE ter `authMiddleware` e verificar `req.user.id === userId`.

**Código Vulnerável:**
```typescript
// backend/src/routes/sessionRoutes.ts:8-10
sessionRoutes.post("/", sessionController.create);       // público!
sessionRoutes.put("/:userId", sessionController.update)  // público!
```

**Código Corrigido:**
```typescript
sessionRoutes.put("/:userId", authMiddleware, sessionController.update);
// No controller: verificar req.user.id === userId
```

**CWE:** CWE-306 (Missing Authentication for Critical Function)

---

### SEC-07 — XSS via Template Literals na Janela de Impressão

> **Severidade:** Crítica | **Prioridade:** Imediata

- **O Problema:** Dados do usuário (`user.name`, `company`) e dados de check-in são injetados diretamente em HTML via template literals sem sanitização. Um stored XSS no backend se propagaria aqui.
- **A Mudança Necessária:** Usar `textContent` ou função de escape HTML.

**Código Vulnerável:**
```typescript
// frontend/src/pages/pontoViewPage.tsx:83-167
const nome = user?.name ?? "Colaborador"
const tableRows = pontos.map(ponto => `
    <tr>
        <td>${formatTime(ponto.createdAt)}</td>
        <td>${formatType(ponto.type)}</td>
        <td style="font-size: 10px;">${ponto.latitude.toFixed(4)}, ${ponto.longitude.toFixed(4)}</td>
    </tr>
`).join("")

printWindow.document.write(`
    ...
    <p><b>Colaborador:</b> ${nome}</p>
    <p><b>Data:</b> ${dataRelatorio}</p>
    <p><b>Empresa:</b> ${company}</p>
    ...
    ${tableRows}
`);
```

**Código Corrigido:**
```typescript
function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
// Usar: ${escapeHtml(nome)}
```

**CWE:** CWE-79 (Cross-site Scripting)

---

### SEC-08 — Credenciais PostgreSQL Hardcoded no Docker

> **Severidade:** Crítica | **Prioridade:** Imediata

- **O Problema:** Senha padrão `postgres/postgres` em texto plano no docker-compose. Se usado em produção, qualquer pessoa com acesso à rede pode conectar ao banco.
- **A Mudança Necessária:** Usar variáveis de ambiente com senhas fortes.

**Código Vulnerável:**
```yaml
# backend/docker-compose.yml:7-8
POSTGRESQL_USERNAME=postgres
POSTGRESQL_PASSWORD=postgres
```

**Código Corrigido:**
```yaml
POSTGRESQL_USERNAME=${POSTGRESQL_USERNAME}
POSTGRESQL_PASSWORD=${POSTGRESQL_PASSWORD}
```

**CWE:** CWE-798 (Use of Hard-coded Credentials)

---

### SEC-09 — Credenciais Grafana Hardcoded no Docker

> **Severidade:** Crítica | **Prioridade:** Imediata

- **O Problema:** Senha padrão `admin/admin` para o Grafana em texto plano.
- **A Mudança Necessária:** Usar variáveis de ambiente com senhas geradas aleatoriamente.

**Código Vulnerável:**
```yaml
# backend/docker-compose.yml:33-34
GF_SECURITY_ADMIN_USER=admin
GF_SECURITY_ADMIN_PASSWORD=admin
```

**CWE:** CWE-798

---

### SEC-10 — Grafana com Porta Exposta + Credenciais Padrão

> **Severidade:** Crítica | **Prioridade:** Imediata

- **O Problema:** Porta 3001 mapeada para host combinado com credenciais `admin/admin`. Qualquer pessoa na rede pode acessar o Grafana e explorar dashboards.
- **A Mudança Necessária:** Usar `127.0.0.1:3001:3000` e trocar credenciais.

**Código Vulnerável:**
```yaml
# backend/docker-compose.yml:30-31
ports:
  - "3001:3000"
```

**CWE:** CWE-284 + CWE-798

---

### SEC-14 — Face Descriptor Retornado ao Client (Dados Biométricos)

> **Severidade:** Alta | **Prioridade:** Alta | **Status:** ⚠️ DECISÃO PENDENTE

- **O Problema:** O `faceDescriptor` (vetor biométrico de 128 floats) é retornado ao client via `GET /employees/face`. Dados biométricos são irrevogáveis — se vazados, não podem ser "redefinidos" como uma senha.
- **Análise:** O descriptor é usado no frontend como **fallback de comparação local** no `LivenessChallenge.tsx:363-367`. Quando o backend falha, o frontend compara o rosto capturado com o descriptor salvo localmente.
- **Decisão:** Confiar 100% no backend para validação facial. Remover fallback local.
- **A Mudança Necessária:**
  1. Criar nova rota `GET /employees/face/token` — retorna token de uso único (UUID) com TTL de 30 segundos
  2. Backend armazena `{ token → descriptor }` em Map em memória
  3. Frontend busca token em vez de descriptor
  4. `POST /employees/face/verify` recebe token + descriptor capturado
  5. Backend busca descriptor pelo token, compara e descarta após uso
  6. Remover `fallbackLocalComparison()` do `LivenessChallenge.tsx`
  7. Remover `GET /employees/face` (retorna descriptor bruto)

**Fluxo Atual (vulnerável):**
```
Frontend → GET /employees/face → recebe 128 floats → usa como fallback
```

**Fluxo Proposto (seguro):**
```
Frontend → GET /employees/face/token → recebe token UUID
Frontend → POST /employees/face/verify { token, descriptor } → backend busca pelo token, compara, descarta
```

**CWE:** CWE-200

---

### SEC-15 — Face Descriptor Retornado no Checkin

> **Severidade:** Alta | **Prioridade:** Alta | **Status:** ⚠️ DECISÃO PENDENTE

- **O Problema:** O response de `POST /checkins` retorna `{ checkin, faceDescriptor }`, expondo dados biométricos.
- **Análise:** O frontend **ignora** o campo `faceDescriptor` na resposta do checkin. Não é usado em lugar nenhum.
- **Decisão:** Remover `faceDescriptor` do response. Não há necessidade.

**Código Vulnerável:**
```typescript
// backend/src/controller/CheckinController.ts:55-58
const data = {
    checkin: { checkin },
    faceDescriptor: user.faceDescriptor   // ← dados biométricos expostos (NÃO USADO)
}
```

**Código Corrigido:**
```typescript
return res.status(201).json({ checkin });
```

**CWE:** CWE-200

---

### SEC-16 — Código de Empresa Hardcoded ("1")

> **Severidade:** Alta | **Prioridade:** Alta

- **O Problema:** A criação de usuário sempre vincula à empresa `"1"`, permitindo que qualquer pessoa crie usuários na empresa "1" sem validação de convite.
- **A Mudança Necessária:** Implementar fluxo de convite adequado.

**Código Vulnerável:**
```typescript
// backend/src/controller/SessionController.ts:33-34,46
const company = await prisma.company.findUnique({
    where: { id: "1" }      // ← hardcoded
})
companyId: "1",             // ← hardcoded
```

**CWE:** CWE-798

---

### SEC-17 — Tokens JWT Armazenados em localStorage

> **Severidade:** Alta | **Prioridade:** Alta

- **O Problema:** O token JWT é armazenado em `localStorage`, acessível por qualquer script JavaScript. Um ataque XSS pode roubar o token.
- **A Mudança Necessária:** Usar cookies `httpOnly` + `Secure` + `SameSite`.

**Código Vulnerável:**
```typescript
// frontend/src/contexts/AuthContext.tsx:106-108
localStorage.setItem("@viggo:user", JSON.stringify(user));
localStorage.setItem("@viggo:token", token);
localStorage.setItem("@viggo:company", company)
```

**CWE:** CWE-922

---

### SEC-18 — JSON.parse sem Try-Catch no localStorage

> **Severidade:** Alta | **Prioridade:** Alta

- **O Problema:** `JSON.parse(masterUser)` sem proteção `try/catch`. Se o conteúdo for corrompido ou manipulado (XSS), a aplicação crasha.
- **A Mudança Necessária:** Envolver em try/catch com fallback para limpeza de sessão.

**Código Vulnerável:**
```typescript
// frontend/src/contexts/AuthContext.tsx:161
setUser(JSON.parse(masterUser)); // ← SEM try-catch!
```

**Código Corrigido:**
```typescript
try {
  setUser(JSON.parse(masterUser));
} catch {
  clearSession();
  return;
}
```

**CWE:** CWE-20

---

### SEC-19 — Verificação de Rotas Apenas no Cliente

> **Severidade:** Alta | **Prioridade:** Alta | ✅ **CORRIGIDO EM 30/06/2026**

- **O Problema:** O `role` do usuário é lido de `localStorage`, manipulável pelo cliente. Um atacante pode forçar `role: "MASTER"` e acessar rotas de administração na UI.
- **Correção Aplicada:** Removido `@viggo:user` e `@viggo:company` do `localStorage`. `user` agora é derivado do decode do JWT assinado pelo backend (`utils/jwt.ts`). Adicionados `name`, `email`, `companyName` ao payload do JWT (4 locais: SessionController, CompanyController signup, CompanyController invite, MasterController impersonation). Criado endpoint `GET /auth/me` para buscar `hasFaceDescriptor` atualizado. `AuthContext.tsx` completamente refatorado para confiar apenas no JWT.

**CWE:** CWE-862 / CWE-602

---

### SEC-20 — Token JWT Exposto em React Context Global

> **Severidade:** Alta | **Prioridade:** Alta

- **O Problema:** O token JWT completo é exposto via React Context para **todos** os componentes filhos, incluindo bibliotecas de terceiros.
- **A Mudança Necessária:** Não expor o token diretamente no context.

**Código Vulnerável:**
```typescript
// frontend/src/contexts/AuthContext.tsx:179
<AuthContext.Provider value={{ ..., token, ... }}>
```

**CWE:** CWE-922

---

### SEC-21 — Impersonation com Restauração de Token pelo Cliente

> **Severidade:** Alta | **Prioridade:** Alta

- **O Problema:** O token do master é armazenado em `localStorage` durante impersonação. Um atacante com XSS pode extrair o token master e alternar entre impersonação e conta master.
- **A Mudança Necessária:** Gerenciar impersonação pelo backend com tokens de uso único.

**Código Vulnerável:**
```typescript
// frontend/src/contexts/AuthContext.tsx:140-150
const startImpersonation = useCallback((newToken: string, newUser: User, companyName: string) => {
    localStorage.setItem("@viggo:masterToken", token!);    // salva token master
    localStorage.setItem("@viggo:masterUser", JSON.stringify({ ...user, companyName }));
    localStorage.setItem("@viggo:token", newToken);
    // ...
```

**CWE:** CWE-287 / CWE-602

---

### SEC-22 — Testes e Lint Ignorados com `|| true` no CI/CD

> **Severidade:** Alta | **Prioridade:** Alta

- **O Problema:** `npm run lint || true` e `npm test || true` silenciam falhas — o pipeline nunca falha por erros de lint ou teste.
- **A Mudança Necessária:** Remover `|| true`. Falhas devem quebrar o pipeline.

**Código Vulnerável:**
```yaml
# .github/workflows/ci-cd.yml:43,46
run: npm run lint || true
run: npm test || true
```

**Código Corrigido:**
```yaml
run: npm run lint
run: npm test
```

**CWE:** CWE-691

---

### SEC-23 — Ausência de SAST/Dependency Scanning no CI/CD

> **Severidade:** Alta | **Prioridade:** Alta

- **O Problema:** Nenhum scanner de segurança (SAST, dependency audit) é executado no pipeline.
- **A Mudança Necessária:** Adicionar `npm audit`, CodeQL ou Trivy.

**Código Corrigido:**
```yaml
- name: Run security audit
  run: npm audit --audit-level=high
```

**CWE:** CWE-354

---

### SEC-24 — PostgreSQL com Porta Exposta Externamente

> **Severidade:** Alta | **Prioridade:** Alta

- **O Problema:** Porta 5432 mapeada para host — acesso externo ao banco de dados.
- **A Mudança Necessária:** Usar `127.0.0.1:5432:5432` ou remover mapeamento.

**Código Vulnerável:**
```yaml
# backend/docker-compose.yml:4-5
ports:
  - "5432:5432"
```

**CWE:** CWE-284

---

### SEC-25 — Prometheus com Porta Exposta sem Autenticação

> **Severidade:** Alta | **Prioridade:** Alta

- **O Problema:** Porta 9090 acessível externamente sem autenticação HTTP.
- **A Mudança Necessária:** Usar `127.0.0.1:9090:9090` e configurar autenticação.

**Código Vulnerável:**
```yaml
# backend/docker-compose.yml:15-16
ports:
  - "9090:9090"
```

**CWE:** CWE-306

---

### SEC-26 — `--web.enable-lifecycle` no Prometheus

> **Severidade:** Alta | **Prioridade:** Alta

- **O Problema:** Permite recarregar config via HTTP POST sem autenticação, permitindo que atacantes mudem os targets de scrape.
- **A Mudança Necessária:** Remover `--web.enable-lifecycle`.

**Código Vulnerável:**
```yaml
# backend/docker-compose.yml:25
- '--web.enable-lifecycle'
```

**CWE:** CWE-642

---

### SEC-27 — Containers Rodando como Root

> **Severidade:** Alta | **Prioridade:** Alta

- **O Problema:** Todos os containers executam como root (sem `user:` definido), maximizando impacto de uma escape.
- **A Mudança Necessária:** Adicionar `user: "1000:1000"` e `cap_drop: [ALL]`.

**CWE:** CWE-250

---

### SEC-28 — node-exporter com Acesso a `/proc`, `/sys`, `/`

> **Severidade:** Alta | **Prioridade:** Alta

- **O Problema:** Mount de `/proc`, `/sys` e `/` (raiz) no container, expondo informações do host.
- **A Mudança Necessária:** Usar apenas paths estritamente necessários.

**Código Vulnerável:**
```yaml
# backend/docker-compose.yml:48-50
volumes:
  - /proc:/host/proc:ro
  - /sys:/host/sys:ro
  - /:/rootfs:ro
```

**CWE:** CWE-284

---

### SEC-29 — cadvisor com Acesso ao Docker e Filesystem

> **Severidade:** Alta | **Prioridade:** Alta

- **O Problema:** Mount de `/`, `/var/lib/docker/`, `/dev/disk/` no container cadvisor.
- **A Mudança Necessária:** Remover mounts desnecessários.

**Código Vulnerável:**
```yaml
# backend/docker-compose.yml:62-68
volumes:
  - /:/rootfs:ro
  - /var/lib/docker/:/var/lib/docker:ro
  - /dev/disk/:/dev/disk:ro
```

**CWE:** CWE-284

---

### SEC-30 — Prometheus sem Autenticação HTTP

> **Severidade:** Alta | **Prioridade:** Alta

- **O Problema:** Prometheus não possui configuração de autenticação HTTP.
- **A Mudança Necessária:** Criar `web.config.yml` com `basic_auth`.

**CWE:** CWE-306

---

### SEC-31 — Ausência de Security Headers (Helmet)

> **Severidade:** Média | **Prioridade:** Média

- **O Problema:** Não há `helmet()` — faltam headers como `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`, `Content-Security-Policy`.
- **A Mudança Necessária:** Adicionar `app.use(helmet())`.

**Código Vulnerável:**
```typescript
// backend/src/app.ts (ausência completa)
```

**Código Corrigido:**
```typescript
import helmet from 'helmet';
app.use(helmet());
```

**CWE:** CWE-693

---

### SEC-32 — Ausência de Proteção CSRF

> **Severidade:** Média | **Prioridade:** Média

- **O Problema:** Não há middleware de CSRF. Embora JWT via Authorization header seja menos vulnerável, não há proteção adicional.
- **A Mudança Necessária:** Adicionar `helmet()` e configurar CORS adequadamente.

**CWE:** CWE-352

---

### SEC-33 — CORS sem Credentials e sem MaxAge

> **Severidade:** Média | **Prioridade:** Média

- **O Problema:** CORS configurado sem `credentials: true` (se necessário) e sem `maxAge` para preflight caching.
- **A Mudança Necessária:** Adicionar `maxAge` e revisar necessidade de `credentials`.

**Código Vulnerável:**
```typescript
// backend/src/app.ts:14-18
app.use(cors({
  origin: Env.FRONTEND_URL,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}))
```

**CWE:** CWE-942

---

### SEC-34 — Rate Limiter Ausente na Criação de Conta

> **Severidade:** Média | **Prioridade:** Média

- **O Problema:** A rota de criação de usuário não tem rate limiter dedicado, permitindo criação massiva de contas.
- **A Mudança Necessária:** Adicionar `authLimiter` na rota de registro.

**Código Vulnerável:**
```typescript
// backend/src/routes/sessionRoutes.ts:8
sessionRoutes.post("/", sessionController.create); // sem rate limiter!
```

**CWE:** CWE-770

---

### SEC-35 — Logging Excessivo de Dados Sensíveis

> **Severidade:** Média | **Prioridade:** Média

- **O Problema:** Logs incluem IP, User-Agent, userId, companyId. Erros do Prisma são logados completos, expondo queries com dados sensíveis.
- **A Mudança Necessária:** Em produção, logar apenas sanitized errors.

**Código Vulnerável:**
```typescript
// backend/src/controller/CheckinController.ts:64
console.error("ERRO COMPLETO DO PRISMA:", error);
```

**CWE:** CWE-532

---

### SEC-36 — Senha com Mínimo de 6 Caracteres

> **Severidade:** Média | **Prioridade:** Média

- **O Problema:** 6 caracteres é muito baixo para senhas.
- **A Mudança Necessária:** Exigir mínimo 8 caracteres com complexidade.

**Código Vulnerável:**
```typescript
// backend/src/controller/SessionController.ts:17
password: z.string().min(6, "A senha deve conter no mínimo 6 caracteres")
```

**Código Corrigido:**
```typescript
password: z.string()
  .min(8, "A senha deve conter no mínimo 8 caracteres")
  .regex(/[A-Z]/, "Deve conter pelo menos uma letra maiúscula")
  .regex(/[0-9]/, "Deve conter pelo menos um número")
```

**CWE:** CWE-521

---

### SEC-37 — Entropia Fraca no JWT_SECRET

> **Severidade:** Média | **Prioridade:** Média

- **O Problema:** Documentação sugere `JWT_SECRET="super-secret-key"` — entropia insuficiente.
- **A Mudança Necessária:** Documentar mínimo de 256 bits de entropia.

**CWE:** CWE-330

---

### SEC-38 — Endpoint `/metrics` sem Autenticação

> **Severidade:** Média | **Prioridade:** Média

- **O Problema:** Métricas Prometheus expostas sem autenticação, expondo dados operacionais.
- **A Mudança Necessária:** Proteger com autenticação ou restringir a IPs internos.

**Código Vulnerável:**
```typescript
// backend/src/app.ts:30
app.get('/metrics', metricsEndpoint);
```

**CWE:** CWE-200

---

### SEC-39 — Race Condition na Validação de Convite

> **Severidade:** Média | **Prioridade:** Média

- **O Problema:** Leitura e escrita de `currentUses` não são atômicas — duas requests simultâneas podem passar na validação.
- **A Mudança Necessária:** Usar `UPDATE ... WHERE currentUses < maxUses RETURNING *` ou lock pessimista.

**Código Vulnerável:**
```typescript
// backend/src/controller/company/CompanyController.ts:531-576
const inviteToken = await prisma.inviteToken.findUnique({ where: { token } });
// ... validações ...
const result = await prisma.$transaction(async (tx) => {
    // incrementa currentUses — mas a leitura anterior não é atômica
});
```

**CWE:** CWE-362

---

### SEC-40 — Senha Removida via Destructuring mas Objeto Original em Memória

> **Severidade:** Média | **Prioridade:** Média

- **O Problema:** `const { password, ...employeeWithoutPassword } = employee` remove a senha do objeto, mas o `employee` original com a senha ainda existe em memória.
- **A Mudança Necessária:** Usar `select` no Prisma para nunca buscar a senha.

**Código Vulnerável:**
```typescript
// backend/src/controller/EmployeesController.ts:39
const { password, ...employeeWithoutPassword } = employee
```

**Código Corrigido:**
```typescript
const employees = await prisma.user.findMany({
  select: { id: true, name: true, email: true, role: true }
});
```

**CWE:** CWE-200

---

### SEC-41 — `as any` no CheckinQuery Suprime Erros de Tipo

> **Severidade:** Média | **Prioridade:** Média

- **O Problema:** `as any` suprime erros de tipo do Prisma, possivelmente escondendo queries incorretas.
- **A Mudança Necessária:** Remover `as any` e corrigir o tipo.

**Código Vulnerável:**
```typescript
// backend/src/controller/EmployeesController.ts:28
} as any
```

**CWE:** CWE-704

---

### SEC-42 — Plan Middleware Depende de `req.planInfo` sem Injeção Prévia

> **Severidade:** Média | **Prioridade:** Média

- **O Problema:** `requireActivePlan` depende de `planInfo` que só é definido por `planMiddleware`. Se usado sem o antecedente, sempre retorna 403.
- **A Mudança Necessária:** Garantir chain de middlewares ou tornar `requireActivePlan` self-contained.

**Código Vulnerável:**
```typescript
// backend/src/middleware/PlanMiddleware.ts:49
export function requireActivePlan(req: Request, res: Response, next: NextFunction) {
  const planInfo = (req as any).planInfo as PlanInfo;
  if (!planInfo) {
    return res.status(403).json({ message: 'Empresa não encontrada' });
  }
```

**CWE:** CWE-863

---

### SEC-43 — Audit Middleware Silencia Falhas

> **Severidade:** Média | **Prioridade:** Média

- **O Problema:** Falha ao criar audit log é silenciosamente ignorada com `console.error`. Em ações críticas como impersonate, isso pode significar que ações maliciosas ficam sem registro.
- **A Mudança Necessária:** Em produção, falha de audit log deve gerar alerta.

**Código Vulnerável:**
```typescript
// backend/src/middleware/AuditMiddleware.ts:41-43
} catch (error) {
    console.error('Failed to create audit log:', error);
}
```

**CWE:** CWE-284

---

### SEC-44 — Fetch de URL da API com Fallback para Localhost

> **Severidade:** Média | **Prioridade:** Média

- **O Problema:** Se `VITE_API_URL` não estiver definida, a aplicação faz requisições para `http://localhost:3333`, expondo dados para qualquer servidor local.
- **A Mudança Necessária:** Falhar explicitamente se a variável não estiver definida.

**Código Vulnerável:**
```typescript
// frontend/src/pages/CustomPlanPage.tsx:74
const response = await fetch(
  `${import.meta.env.VITE_API_URL || "http://localhost:3333"}/master/leads`, {
    method: "POST",
    // ...
  }
);
```

**Código Corrigido:**
```typescript
const API_URL = import.meta.env.VITE_API_URL;
if (!API_URL) throw new Error("VITE_API_URL is not configured");
```

**CWE:** CWE-200

---

### SEC-45 — Variável VITE Exposta no Build

> **Severidade:** Média | **Prioridade:** Média

- **O Problema:** Variáveis com prefixo `VITE_` são embutidas no bundle JavaScript e acessíveis pelo cliente.
- **A Mudança Necessária:** Usar `VITE_` apenas para valores não-secretos. Garantir HTTPS em produção.

**CWE:** CWE-200

---

### SEC-46 — Modelos de ML Faciais Servidos Estaticamente

> **Severidade:** Média | **Prioridade:** Média

- **O Problema:** Modelos de reconhecimento facial são carregados de `/models` no diretório público — qualquer pessoa pode baixar e entender a arquitetura.
- **A Mudança Necessária:** Servir via CDN com headers restritivos ou API autenticada.

**Código Vulnerável:**
```typescript
// frontend/src/components/FaceAuth.tsx:23
const MODEL_URL = '/models';
await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
```

**CWE:** CWE-200

---

### SEC-47 — Race Condition na Validação Facial

> **Severidade:** Média | **Prioridade:** Média

- **O Problema:** `setInterval(checkPose, 100)` continua executando durante validação assíncrona, e o closure captura valores desatualizados.
- **A Mudança Necessária:** Usar Mutex ou abort controller.

**Código Vulnerável:**
```typescript
// frontend/src/components/LivenessChallenge.tsx:464-513
if (heldTime >= config.holdDuration && !isValidatingRef.current) {
    isValidatingRef.current = true;
    const backendResult = await validateDescriptorWithBackend(detection.descriptor);
    // ...
    isValidatingRef.current = false;
}
```

**CWE:** CWE-362

---

### SEC-48 — CSRF Ausente no Frontend

> **Severidade:** Média | **Prioridade:** Média

- **O Problema:** Não há proteção CSRF nas requisições fetch do frontend.
- **A Mudança Necessária:** Implementar CSRF tokens ou cookies httpOnly com SameSite=Strict.

**CWE:** CWE-352

---

### SEC-49 — Força Bruta sem Proteção no Login

> **Severidade:** Média | **Prioridade:** Média

- **O Problema:** Não há rate limiting, CAPTCHA ou bloqueio temporal no frontend.
- **A Mudança Necessária:** Adicionar CAPTCHA após N tentativas falhas.

**Código Vulnerável:**
```typescript
// frontend/src/pages/loginPage.tsx:23-46
async function handleSubmit(_prevState: unknown, formData: FormData) {
    // ...
    try {
      const user = await login(payload.email, payload.password);
    } catch {
      return { message: "Erro ao fazer login, tente novamente em alguns segundos!", payload };
    }
  }
```

**CWE:** CWE-307

---

### SEC-50 — CPF Enviado em Texto Plano

> **Severidade:** Média | **Prioridade:** Média

- **O Problema:** CPF é enviado em texto plano no body da requisição de signup.
- **A Mudança Necessária:** Garantir HTTPS em produção. Mascarar CPF.

**Código Vulnerável:**
```typescript
// frontend/src/pages/CompanySignupPage.tsx:60-69
const response = await api.auth.signup({
    cpf: cpfDigits,  // CPF em texto plano
    // ...
});
```

**CWE:** CWE-312 / CWE-319

---

### SEC-51 — Face Descriptor Enviado sem Criptografia

> **Severidade:** Média | **Prioridade:** Média

- **O Problema:** O descritor facial (vetor biométrico) é enviado via PUT sem criptografia.
- **A Mudança Necessária:** Criptografar com chave pública do backend (RSA) ou usar WebCrypto.

**Código Vulnerável:**
```typescript
// frontend/src/services/api.ts:107-116
updateFaceDescriptor: (userId: string, descriptor: number[]) =>
      fetchApi<User>(`/sessions/${userId}`, {
        method: "PUT",
        body: JSON.stringify({ faceDescriptor: descriptor }),
      }),
```

**CWE:** CWE-319

---

### SEC-52 — Ausência de CSP no index.html

> **Severidade:** Média | **Prioridade:** Média

- **O Problema:** `index.html` não possui meta tags de segurança como CSP, X-Frame-Options, etc.
- **A Mudança Necessária:** Adicionar CSP via meta tag ou headers.

**Código Vulnerável:**
```html
<!-- frontend/index.html -->
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Viggo</title>
</head>
```

**Código Corrigido:**
```html
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';">
```

**CWE:** CWE-693

---

### SEC-53 — Deploy via SSH sem Verificação de Integridade

> **Severidade:** Média | **Prioridade:** Média

- **O Problema:** Deploy remoto via SSH sem verificar digest da imagem Docker.
- **A Mudança Necessária:** Usar tags digest (`@sha256:...`) em vez de `latest`.

**CWE:** CWE-345

---

### SEC-54 — YAML Malformado (Deploy Job Duplicado)

> **Severidade:** Média | **Prioridade:** Média

- **O Problema:** Step com `- name:` duplicado causa erro de parsing.
- **A Mudança Necessária:** Remover linha duplicada.

**Código Vulnerável:**
```yaml
# .github/workflows/ci-cd.yml:171-172
- name: Deploy to VPS
- name: Deploy to VPS
```

**CWE:** CWE-670

---

### SEC-55 — Tags `latest` em Imagens Docker

> **Severidade:** Média | **Prioridade:** Média

- **O Problema:** Imagens sem tag fixa — builds não reproduzíveis.
- **A Mudança Necessária:** Fixar versões (ex: `bitnami/postgresql:16.3.0`).

**CWE:** CWE-829

---

### SEC-56 — Containers sem `read_only: true`

> **Severidade:** Média | **Prioridade:** Média

- **O Problema:** Containers permitem escrita no filesystem.
- **A Mudança Necessária:** Adicionar `read_only: true` e `tmpfs: [/tmp]`.

**CWE:** CWE-732

---

### SEC-57 — Containers sem `security_opt` ou `cap_drop`

> **Severidade:** Média | **Prioridade:** Média

- **O Problema:** Containers com capabilities padrão do Docker.
- **A Mudança Necessária:** Adicionar `security_opt: [no-new-privileges:true]` e `cap_drop: [ALL]`.

**CWE:** CWE-250

---

### SEC-58 — Datasource Grafana→Prometheus sem Autenticação

> **Severidade:** Média | **Prioridade:** Média

- **O Problema:** Conexão Grafana→Prometheus sem credenciais.
- **A Mudança Necessária:** Configurar auth se Prometheus tiver.

**Código Vulnerável:**
```yaml
# backend/grafana/provisioning/datasources/prometheus.yml:7
url: http://prometheus:9090
```

**CWE:** CWE-306

---

### SEC-59 — User Role Exposta no Retorno de Erro

> **Severidade:** Baixa | **Prioridade:** Baixa

- **O Problema:** Erro 403 retorna `requiredRoles` e `currentRole`, ajudando atacantes a entender o modelo de permissões.
- **A Mudança Necessária:** Retornar apenas `message` genérico.

**Código Vulnerável:**
```typescript
// backend/src/middleware/RoleGuard.ts:13-17
return res.status(403).json({ 
    message: 'Acesso negado. Permissão insuficiente.',
    requiredRoles: allowedRoles,
    currentRole: userRole,
});
```

**CWE:** CWE-200

---

### SEC-60 — Health Check Expõe Mensagens de Erro

> **Severidade:** Baixa | **Prioridade:** Baixa

- **O Problema:** `readinessCheck` retorna `error.message`, expondo detalhes de conexão ao banco.
- **A Mudança Necessária:** Retornar apenas status.

**Código Vulnerável:**
```typescript
// backend/src/middleware/HealthCheckMiddleware.ts:40-41
error: error instanceof Error ? error.message : 'Unknown error',
```

**CWE:** CWE-200

---

### SEC-61 — Ausência de `permissions` no Workflow CI/CD

> **Severidade:** Média | **Prioridade:** Média

- **O Problema:** `GITHUB_TOKEN` com permissões padrão excessivas.
- **A Mudança Necessária:** Adicionar `permissions: contents: read` e restringir por job.

**CWE:** CWE-269

---

### SEC-62 — Ausência de `timeout-minutes` nos Jobs

> **Severidade:** Baixa | **Prioridade:** Baixa

- **O Problema:** Jobs podem rodar indefinidamente em caso de hung process.
- **A Mudança Necessária:** Adicionar `timeout-minutes: 15` nos jobs de teste/build.

**CWE:** CWE-835

---

### SEC-63 — Containers sem Healthchecks

> **Severidade:** Baixa | **Prioridade:** Baixa

- **O Problema:** Containers sem verificação de saúde.
- **A Mudança Necessária:** Adicionar `healthcheck:` em cada serviço.

**CWE:** CWE-693

---

### SEC-64 — `external_labels` Hardcoded no Prometheus

> **Severidade:** Baixa | **Prioridade:** Baixa

- **O Problema:** Nome do serviço e ambiente expostos em métricas.
- **A Mudança Necessária:** Usar variáveis de ambiente.

**Código Vulnerável:**
```yaml
# backend/prometheus.yml:4-6
environment: 'development'
service: 'viggo-backend'
```

**CWE:** CWE-200

---

### SEC-65 — Preços Hardcoded no shared/plans.ts

> **Severidade:** Baixa | **Prioridade:** Baixa

- **O Problema:** Lógica de preços exposta no bundle do cliente.
- **A Mudança Necessária:** Buscar preços de uma API/banco de dados no backend.

**Código Vulnerável:**
```typescript
// shared/plans.ts:25,46,67
price: 49.9,
price: 149.9,
price: 349.9,
```

**CWE:** CWE-200

---

### SEC-66 — Redirecionamento Baseado em Resposta 403

> **Severidade:** Baixa | **Prioridade:** Baixa

- **O Problema:** Redirecionamento para `/register` baseado em `error.code` do backend — se MITM, poderia redirecionar para qualquer rota.
- **A Mudança Necessária:** Verificar se o código é valor esperado (whitelist).

**Código Vulnerável:**
```typescript
// frontend/src/services/api.ts:28-34
if (response.status === 403) {
    const error = await response.json().catch(() => ({}));
    if (error.code === "FACE_NOT_REGISTERED") {
      window.location.href = "/register";
```

**CWE:** CWE-601

---

### SEC-67 — Token de Convite na URL (Leak via Referer)

> **Severidade:** Baixa | **Prioridade:** Baixa

- **O Problema:** Token de convite passado como parâmetro de rota — fica em logs, histórico e headers Referer.
- **A Mudança Necessária:** Usar query parameter com token de uso único.

**Código Vulnerável:**
```typescript
// frontend/src/routes/AuthRoutes.tsx:18
<Route path="/accept-invite/:token" element={<AcceptInvitePage />} />
```

**CWE:** CWE-598

---

### SEC-68 — Coordenadas em href sem Validação

> **Severidade:** Baixa | **Prioridade:** Baixa

- **O Problema:** Coordenadas de latitude/longitude inseridas diretamente em URL sem validação numérica.
- **A Mudança Necessária:** Validar que são números válidos.

**Código Vulnerável:**
```typescript
// frontend/src/pages/pontoViewPage.tsx:227
<a href={`https://www.google.com/maps/search/?api=1&query=${ponto.latitude},${ponto.longitude}`}>
```

**Código Corrigido:**
```typescript
const lat = Number(ponto.latitude);
const lng = Number(ponto.longitude);
if (isNaN(lat) || isNaN(lng)) return null;
```

**CWE:** CWE-79

---

## 3. CORRIGIDOS ✅

---

### SEC-03 — Multi-tenancy com Variável Global (Race Condition)

> **Severidade:** Crítica | **Prioridade:** Imediata | ✅ **CORRIGIDO EM 30/06/2026**

- **O Problema:** Variáveis globais `currentCompanyId` e `currentUserId` eram compartilhadas entre requests, causando race condition.
- **Correção Aplicada:** Substituídas por `AsyncLocalStorage`. Arquivos alterados: `prisma-extensions.ts`, `AuthMiddleware.ts`.

**Código Corrigido:**
```typescript
// backend/src/database/prisma-extensions.ts
import { AsyncLocalStorage } from 'node:async_hooks';
export const prismaContextStore = new AsyncLocalStorage<PrismaContext>();
```

**CWE:** CWE-362

---

### SEC-04 — Employees sem Filtro por Empresa

> **Severidade:** Crítica | **Prioridade:** Imediata | ✅ **CORRIGIDO EM 30/06/2026**

- **O Problema:** `prisma.user.findMany()` sem filtro por `companyId` retornava TODOS os usuários de TODAS as empresas.
- **Correção Aplicada:** `EmployeesController` migrado de `prisma` para `extendedPrisma`. Adicionado `select` explícito para nunca buscar senha.

**CWE:** CWE-862 / CWE-200

---

### SEC-05 — Checkins de Todas as Empresas Expostos

> **Severidade:** Crítica | **Prioridade:** Imediata | ✅ **CORRIGIDO EM 30/06/2026**

- **O Problema:** Query de checkins usava `as any` e não filtrava por `companyId`.
- **Correção Aplicada:** Migrado para `extendedPrisma` com filtro automático por `companyId`. Removido `as any`.

**CWE:** CWE-862

---

### SEC-06 — `extendedPrisma` Não Utilizado nos Controllers

> **Severidade:** Crítica | **Prioridade:** Imediata | ✅ **CORRIGIDO EM 30/06/2026**

- **O Problema:** `CheckinController` e `AuditMiddleware` importavam `prisma` direto.
- **Correção Aplicada:** Migrados para `extendedPrisma`. Todos os controllers/middlewares agora passam pelo interceptor de multi-tenancy.

**CWE:** CWE-862

---

### SEC-11 — Exposição de Erro Completo ao Client

> **Severidade:** Alta | **Prioridade:** Alta | ✅ **CORRIGIDO EM 30/06/2026**

- **O Problema:** Middleware global de erros retornava `err.message` ao client.
- **Correção Aplicada:** Removido `error: err.message` do response. Retorna apenas mensagem genérica.

**CWE:** CWE-209

---

### SEC-12 — Detalhes de Erro JWT Expostos ao Client

> **Severidade:** Alta | **Prioridade:** Alta | ✅ **CORRIGIDO EM 30/06/2026**

- **O Problema:** Detalhes do erro JWT ("jwt expired", "jwt malformed") retornados ao client.
- **Correção Aplicada:** Removido `details: error.message` do catch do AuthMiddleware.

**CWE:** CWE-209

---

### SEC-13 — JWT sem Algorithm Pinning

> **Severidade:** Alta | **Prioridade:** Alta | ✅ **CORRIGIDO EM 30/06/2026**

- **O Problema:** `jwt.verify` sem `algorithms` permitia bypass via algoritmo `none` ou `RS256`.
- **Correção Aplicada:** Adicionado `{ algorithms: ['HS256'] }` ao `jwt.verify`.

**CWE:** CWE-327

---

### SEC-19 — Verificação de Rotas Apenas no Cliente

> **Severidade:** Alta | **Prioridade:** Alta | ✅ **CORRIGIDO EM 30/06/2026**

- **O Problema:** `user.role` lido de `localStorage`, manipulável pelo cliente. Atacante poderia forçar `role: "MASTER"` e ver UI admin.
- **Correção Aplicada:** `@viggo:user` e `@viggo:company` removidos do `localStorage`. User derivado do JWT assinado (`decodeJWT`). Payload do JWT expandido com `name`, `email`, `companyName` em todos os 4 locais de assinatura. Endpoint `GET /auth/me` criado para `hasFaceDescriptor`. `AuthContext.tsx` refatorado.

**CWE:** CWE-862 / CWE-602

---

### SEC-18 — JSON.parse sem Try-Catch no localStorage

> **Severidade:** Alta | **Prioridade:** Alta | ✅ **CORRIGIDO EM 30/06/2026**

- **O Problema:** `JSON.parse(masterUser)` sem proteção `try/catch`. Se o conteúdo for corrompido ou manipulado (XSS), a aplicação crasha.
- **Correção Aplicada:** Resolvido pelo refactoring do SEC-19. `@viggo:masterUser` removido do `localStorage`. Toda decodificação de token agora usa `decodeJWT()` (`utils/jwt.ts`) que envolve `JSON.parse` em try/catch com retorno `null` em caso de falha.

**Código Corrigido:**
```typescript
// frontend/src/utils/jwt.ts
export function decodeJWT(token: string): JWTPayload | null {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload)) as JWTPayload;
  } catch {
    return null;
  }
}
```

**CWE:** CWE-20

---

### SEC-40 — Senha Removida via Destructuring mas Objeto Original em Memória

> **Severidade:** Média | **Prioridade:** Média | ✅ **CORRIGIDO EM 30/06/2026**

- **O Problema:** `const { password, ...userWithoutPassword } = employee` remove a senha do objeto destruturado, mas o objeto original `employee` com a senha ainda existe em memória. Além disso, `SessionController.create` retornava o objeto `user` completo (incluindo hash da senha) ao client.
- **Correção Aplicada:** Removido destructuring em `CompanyController.signup` e `CompanyController.acceptInvite`. Objetos de resposta agora são construídos diretamente com campos explícitos. `SessionController.create` agora retorna objeto explícito sem password.

**Código Corrigido:**
```typescript
// SessionController.create — antes retornava user completo com password
return res.status(201).json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    companyId: user.companyId,
});

// CompanyController.signup/acceptInvite — antes usava destructuring
return res.status(201).json({
    user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
    },
    // ...
});
```

**CWE:** CWE-200

---

### SEC-41 — `as any` no CheckinQuery Suprime Erros de Tipo

> **Severidade:** Média | **Prioridade:** Média | ✅ **CORRIGIDO EM 30/06/2026**

- **O Problema:** `as any` no `EmployeesController` suprimia erros de tipo do Prisma, possivelmente escondendo queries incorretas.
- **Correção Aplicada:** `as any` removido no commit anterior (multi-tenancy). `EmployeesController` agora usa `extendedPrisma` com `select` explícito, eliminando a necessidade de casting.

**CWE:** CWE-704

---

## 4. ESTATÍSTICAS

| Severidade | Total | Pendentes | Corrigidos |
|:---|:---|:---|:---|
| **Crítica** | 10 | 6 | 4 ✅ |
| **Alta** | 20 | 15 | 5 ✅ |
| **Média** | 28 | 25 | 3 ✅ |
| **Baixa** | 10 | 10 | 0 |
| **Total** | **68** | **56** | **12** |

---

## 5. PRIORIDADE DE CORREÇÃO

### Imediata (Próximas 24-48h)
1. ~~**SEC-01** — Bug token sobrescrito~~
2. ~~**SEC-02 + SEC-06** — Rotas sem auth + prisma direto~~
3. ~~**SEC-03 + SEC-04 + SEC-05** — Multi-tenancy quebrado~~ ✅ CORRIGIDO
4. **SEC-07** — XSS na janela de impressão
5. **SEC-08 + SEC-09 + SEC-10** — Credenciais hardcoded no Docker

### Alta (Próxima semana)
6. ~~**SEC-11 + SEC-12** — Exposição de erros~~ ✅ CORRIGIDO
7. ~~**SEC-13** — JWT sem algorithm pinning~~ ✅ CORRIGIDO
8. **SEC-14 + SEC-15** — Dados biométricos expostos (decisão: confiar no backend)
9. ~~**SEC-17 + SEC-18 + SEC-19 + SEC-20 + SEC-21** — Problemas de autenticação no frontend~~ (SEC-18 ✅ SEC-19 ✅)
10. **SEC-22 + SEC-23** — CI/CD sem scanners

### Média (Próximo sprint)
11. **SEC-24 a SEC-30** — Infraestrutura Docker/Prometheus
12. **SEC-31 a SEC-58** — Vulnerabilidades de média severidade (SEC-40 ✅ SEC-41 ✅)

### Baixa (Backlog)
13. **SEC-59 a SEC-68** — Melhorias de configuração e boas práticas

---

## 6. CWEs MAIS FREQUENTES

| CWE | Ocorrências | Descrição |
|:---|:---|:---|
| CWE-200 | 10 | Exposure of Sensitive Information |
| CWE-862 | 5 | Missing Authorization |
| CWE-284 | 5 | Improper Access Control |
| CWE-306 | 4 | Missing Authentication for Critical Function |
| CWE-798 | 4 | Use of Hard-coded Credentials |
| CWE-362 | 3 | Race Condition |
| CWE-693 | 3 | Protection Mechanism Failure |
| CWE-602 | 3 | Client-Side Enforcement of Server-Side Security |
| CWE-250 | 3 | Execution with Unnecessary Privileges |

---

*Relatório gerado automaticamente em 30/06/2026. Recomenda-se revisão periódica conforme o código evolui.*
