# Plano de Implementação — Painel Master: Controle de Acessos e Métricas Viggo

> **Status:** Aprovado — Aguardando implementação  
> **Decisões:** Landing `frontend/src/pages/LandingPage.tsx` (`/page`), painel `frontend/src/routes/MasterRoutes.tsx` (`role MASTER`), coleta própria Postgres, anônimo na landing + autenticado no app, agregado diário  
> **Autor:** Muse Spark + solicitante — 2026-08-23

---

## Índice

1. [Objetivo e Decisões Consolidadas](#1-objetivo-e-decisões-consolidadas)
2. [Catálogo de Métricas](#2-catálogo-de-métricas)
3. [Arquitetura Geral](#3-arquitetura-geral)
4. [Modelo de Dados (Prisma)](#4-modelo-de-dados-prisma)
5. [Coleta — Frontend](#5-coleta--frontend)
6. [Backend — API e Agregações](#6-backend--api-e-agregações)
7. [Painel Master — UI/UX](#7-painel-master--uiux)
8. [LGPD, Privacidade e Retenção](#8-lgpd-privacidade-e-retenção)
9. [Plano de Implementação Passo a Passo](#9-plano-de-implementação-passo-a-passo)
10. [Testes e Validação](#10-testes-e-validação)
11. [Riscos e Mitigações](#11-riscos-e-mitigações)
12. [Checklist Final](#12-checklist-final)
13. [Apêndice — Exemplos de Código](#13-apêndice--exemplos-de-código)

---

## 1. Objetivo e Decisões Consolidadas

### Objetivo

Dar ao **painel master** (`/master`) visibilidade do funil completo Viggo: **quantas pessoas acessam a landing** vs **quantas criam empresa** (taxa de conversão), para decidir quando ajustar a página. Base para expandir para trial, receita e engajamento sem rework.

### Decisões

| # | Pergunta | Decisão |
|---|----------|---------|
| 1 | Landing | `frontend/src/pages/LandingPage.tsx` em rota `/page` (`MasterRoutes.tsx:25`), CTAs `to="/company/signup"` (`:75`) e footer `Cadastrar Empresa` (`:198`) |
| 2 | Painel | Existe: `frontend/src/routes/MasterRoutes.tsx:20` guarda `user.role !== "MASTER"` → `MasterLayout` com `/master`, `/master/companies`, `/master/companies/:id`, `/master/meus-dados` |
| 3 | Tipo de evento | **Anônimo na landing + autenticado no app**. Landing usa `visitorId` (hash IP+UA + cookie `vid` first-party), sem `userId`. Após `CompanyController.signup` linka `visitorId → companyId` via evento `signup_success`. App (logins, ponto, justificativas) usa `userId/companyId` autenticado |
| 4 | Provedor | **Própria** — tabelas Postgres (`PageView`/`AnalyticsEvent`), sem Plausible/GA no MVP. Interface `MetricsProvider` permite trocar depois |
| 5 | Granularidade | **Diário** — agregado por dia (`date_trunc('day')`), `DateRange` 7/30/90 dias. Sem live polling no MVP; card opcional `Visitantes últimos 5 min` em Fase 2 se necessário |

---

## 2. Catálogo de Métricas

### Grupo A — Aquisição (Topo do Funil) — **P1 MVP**

| Métrica | Definição | Origem | Uso |
|---------|-----------|--------|-----|
| `landing_page_views` | Total de hits em `/page` | `PageView where path="/page"` | Volume |
| `landing_unique_visitors` | Distintos `visitorId` por dia | `countDistinct(visitorId)` | Base real da conversão |
| `origem` | `utm_source/medium/campaign`, `referrer` | `PageView.utmSource`, `referrer` | Canal que traz |
| `cta_clicks` | Cliques em `Criar conta grátis` / `Cadastrar Empresa` | `AnalyticsEvent name="cta_click"` | Intenção antes do signup |

### Grupo B — Conversão (Meio do Funil) — **P1 MVP**

| Métrica | Definição | Origem | Uso |
|---------|-----------|--------|-----|
| `empresas_criadas` | `Company.createdAt` no período | `Company` | Numerador |
| `taxa_conversao` | `empresas / uniques * 100` | Calculado | **KPI crítico** — alerta se `>500 visitas e <1%` |
| `tempo_ate_signup` | `Company.createdAt - first PageView` | Link `visitorId` | Fricção |
| `abandono_signup` | `signup_view` sem `signup_success` | `AnalyticsEvent` | Vazamento |

### Grupo C — Trial e Ativação — **P2**

| `trial_ativos` (`status=TRIAL`), `trial_expirando_3d/1d`, `trial_expirados_sem_conversao`, `biometria_ativa` (`faceDescriptor not null`) |

### Grupo D — Receita — **P2**

| `mrr`, `assinaturas_ativas/suspensas/trial`, `pagamentos_confirmados/atrasados`, `churn` — de `Company.status` + `Payment` |

### Grupo E — Engajamento — **P2**

| `logins/dia`, `registros_ponto/dia`, `justificativas/dia`, `dispositivos_ativos` (totem) |

### Grupo F — Sistema — **P3**

| `5xx`, `p95 latência`, `jobs falhos` — de `pino`/`health` |

> **MVP = A + B** (landing + conversão). C/D/E são 1 query a mais por card (dados já no banco).

---

## 3. Arquitetura Geral

```
Landing / App  ──sendBeacon──▶  POST /metrics/track  ──▶  PageView
  LandingPage.tsx  (onMount)     (público, rate-limit)      \
  /page + CTAs   ──fetch──────▶  POST /metrics/event  ──▶  AnalyticsEvent
                                                          (Postgres)
                                     │
Painel Master ◀── GET /master/metrics ──┤
  MasterDashboard  (auth MASTER)         Company / Payment / User
  DateRange 7/30/90  agregado diário      (já existem)
```

- **Interface `MetricsProvider`** (mesmo padrão de `EmailProvider`) — troca Postgres → Plausible sem tocar controllers.
- **Sem cookies terceiros** — 1 cookie `vid` first-party `SameSite=Lax`, `Max-Age 1 ano`.
- **Sem IP cru** — `visitorId = sha256(ip + salt + ua)` onde `salt = ENCRYPTION_KEY`.

---

## 4. Modelo de Dados (Prisma)

```prisma
// backend/prisma/schema.prisma — adicionar

model PageView {
  id         String   @id @default(uuid())
  path       String   // "/page" "/company/signup" "/"
  referrer   String?
  utmSource  String?
  utmMedium  String?
  utmCampaign String?
  utmTerm    String?
  utmContent String?
  visitorId  String   // hash ip+ua ou cookie vid
  userAgent  String?
  country    String?  // opcional, via CF-Connecting-IP
  createdAt  DateTime @default(now())

  @@index([path, createdAt])
  @@index([visitorId])
  @@index([createdAt])
}

model AnalyticsEvent {
  id        String   @id @default(uuid())
  name      String   // "cta_click" | "signup_view" | "signup_success"
  props     Json?    // { ctaId: "hero-criar-conta" }
  visitorId String?
  companyId String?
  userId    String?
  createdAt DateTime @default(now())

  @@index([name, createdAt])
  @@index([visitorId])
  @@index([companyId])
}
```

**Alternativa minimalista:** unificar em `AnalyticsEvent` com `name="page_view"` e `props.path`. Proposta mantém 2 tabelas para queries de aquisição mais rápidas (índice em `path`).

**Link anônimo → autenticado:**

- No `POST /metrics/track` gera/lê cookie `vid` e grava `visitorId`.
- No `POST /company/signup` sucesso, frontend envia `POST /metrics/event { name:"signup_success", visitorId, companyId }` ou backend grava direto em `CompanyController.signup:165` (fire-and-forget, mesmo padrão dos e-mails).

**Retenção (LGPD):** `PageView`/`AnalyticsEvent` 90 dias — adicionar limpeza em `jobs/retentionCleanup` (`0 2 * * *` já existe).

---

## 5. Coleta — Frontend

### 5.1 `frontend/src/utils/metrics.ts` (novo)

```ts
export function getVisitorId(): string // lê cookie vid ou gera uuid v4
export function trackPageView(path: string): void // sendBeacon
export function trackEvent(name: string, props?: Record<string, unknown>): void
```

- Usa `navigator.sendBeacon` para `page_view` (não bloqueia unload).
- Fallback para `fetch(..., { keepalive: true })` se `sendBeacon` indisponível.
- Debounce: 1 `page_view` por `session` (30 min) por `path` — guarda `sessionStorage`.

### 5.2 `frontend/src/pages/LandingPage.tsx:22`

```tsx
useEffect(() => {
  trackPageView("/page"); // inclui utm_* de location.search + document.referrer
}, []);
```

### 5.3 CTAs

- `LandingPage.tsx:75` `Criar conta grátis` → `onClick={() => trackEvent("cta_click", { ctaId: "header-criar-conta" })}`
- `LandingPage.tsx:198` `Cadastrar Empresa` → `onClick={() => trackEvent("cta_click", { ctaId: "footer-cadastrar-empresa" })}`
- `HeroContent`, `CTASection`, `PricingSection` — mesmo `cta_click` com `ctaId` distinto.

### 5.4 Signup

- `frontend/src/pages/CompanySignupPage.tsx` (ou rota `/company/signup`) — `useEffect(() => trackEvent("signup_view", { visitorId: getVisitorId() }))` e após sucesso `trackEvent("signup_success", { visitorId, companyId })`.

---

## 6. Backend — API e Agregações

### 6.1 `POST /metrics/track` — público

- **Sem auth**, `rateLimit 60/min/ip` (mesmo `authLimiter` de `authRoutes.ts`).
- Zod:
```ts
z.object({ path: z.string().min(1), referrer: z.string().optional(), utmSource: z.string().optional(), utmMedium: z.string().optional(), utmCampaign: z.string().optional(), utmTerm: z.string().optional(), utmContent: z.string().optional(), visitorId: z.string().optional() })
```
- Resolve `visitorId`: cookie `vid` → body `visitorId` → `hash(ip+ua)` fallback.
- Grava `PageView` async (sem bloquear resposta) — `void prisma.pageView.create(...)`.
- Retorna `201 { visitorId }` e `Set-Cookie: vid=...; SameSite=Lax; Path=/; Max-Age=31536000`.

### 6.2 `POST /metrics/event` — público

- Zod: `{ name: z.enum(["cta_click","signup_view","signup_success"]), props: z.record(z.unknown()).optional(), visitorId: z.string().optional(), companyId: z.string().optional() }`
- Grava `AnalyticsEvent`.

### 6.3 `GET /master/metrics` — protegido `MASTER`

- `MasterRoutes.tsx:20` já guarda frontend; backend adiciona `middleware/requireMaster.ts` (checa `req.user.role === "MASTER"`).
- Query: `?from=2026-08-01&to=2026-08-23&granularity=day` (default últimos 30 dias).
- Resposta:
```ts
{
  acquisition: { views: number, uniques: number, byDay: { date, views, uniques }[], bySource: { utmSource, views, uniques }[] },
  conversion: { companiesCreated: number, rate: number, byDay: { date, count }[] },
  funnel: [{ step: "visit", count: number }, { step: "cta_click", count: number }, { step: "signup_view", count: number }, { step: "company_created", count: number }],
  trial: { active: number, expiring3d: number, expiring1d: number }
}
```
- Queries:
  - `PageView` com `groupBy` + `prisma.$queryRaw` para `date_trunc('day', "createdAt")` (Postgres).
  - `Company where createdAt between from/to`.
  - `AnalyticsEvent where name in (...)`.
- Cache opcional: `Cache-Control: private, max-age=60` (dados diários não precisam realtime).

### 6.4 Estrutura de Arquivos

```
backend/src/
├── services/metrics/
│   ├── metricsProvider.ts   # interface MetricsProvider
│   └── prismaMetricsProvider.ts
├── controller/MetricsController.ts
├── routes/metricsRoutes.ts  # POST /metrics/track, POST /metrics/event
├── routes/masterMetricsRoutes.ts # GET /master/metrics
├── middleware/requireMaster.ts
└── jobs/metricsCleanupJob.ts # opcional, integra em retentionCleanup
```

---

## 7. Painel Master — UI/UX

### Rota

`frontend/src/routes/MasterRoutes.tsx:30` — dentro de `<Route path="/master" element={<MasterLayout />}>`, estender `MasterDashboard` (já existe). Sem nova rota.

### Layout `MasterDashboard.tsx`

- **Header:** título + `DateRangePicker` (7/30/90 dias, default 30) + botão `Exportar CSV` (Fase 2).
- **KPI Cards (grid 4 colunas):**
  - `Visitas` (total + únicas) + `Δ vs período anterior`
  - `Empresas criadas` + `Δ`
  - `Taxa conversão` (grande, com badge verde/vermelho; vermelho se `>500 visitas e <1%` → "Ajustar landing")
  - `Trial ativos` (com subtexto `expirando 3d/1d`)
  - Cada card com `Framer Motion` hover (já em uso) + `skeleton` loading.
- **Funnel (barra horizontal):** 4 etapas com % dropoff — usa `AnalyticsEvent` + `Company`.
- **Gráfico linha dupla:** `visitas` (eixo esq) vs `empresas` (eixo dir) por dia — `Recharts` (adicionar `recharts` ~50kB) ou `Chart.js`. Reuso de `Tailwind` tokens (`primary #0a0a0a`, `brand-green #00d4a4`).
- **Tabela Top Origens:** `utm_source` | visitas | uniques | empresas | conversão.
- **Vazio:** se sem dados → CTA "Compartilhe a landing para começar a medir".

### Dependências novas

- `recharts` (ou `chart.js` + `react-chartjs-2`) — 1 dependência.
- Sem `date-fns` extra (já há `date-fns` no backend; frontend pode usar `Intl`).

---

## 8. LGPD, Privacidade e Retenção

- **Não persistir IP cru** — `visitorId = sha256(ip + ENCRYPTION_KEY + ua)`. IP usado só para hash, descartado.
- **Cookie `vid`** first-party, `SameSite=Lax`, sem cross-site, sem fingerprint.
- **Linkagem:** anônimo até `signup_success`; após, `AnalyticsEvent` com `visitorId + companyId` permite `tempo_ate_signup` sem expor PII.
- **Retenção 90 dias** — `PageView`/`AnalyticsEvent` deletados por `jobs/retentionCleanup` (já roda `0 2 * * *`).
- **Footer:** já há links LGPD em `LandingPage.tsx:184-190` — adicionar menção a cookie anônimo em `PoliticaPrivacidade`.

---

## 9. Plano de Implementação Passo a Passo

### Etapa 0 — Preparação (0,5 dia)

- [ ] `cd backend && npx prisma --version` + `docker-compose -f backend/docker-compose.yml up -d` (Postgres)
- [ ] Criar `docs/PLANO_PAINEL_MASTER.md` (este arquivo)

### Etapa 1 — Dados (0,5 dia)

- [ ] `backend/prisma/schema.prisma` adicionar `PageView` + `AnalyticsEvent`
- [ ] `cd backend && npx prisma migrate dev --name metrics_pageview_event`
- [ ] `npx prisma generate`

### Etapa 2 — Backend Coleta (0,5 dia)

- [ ] `backend/src/services/metrics/metricsProvider.ts` + `prismaMetricsProvider.ts`
- [ ] `backend/src/controller/MetricsController.ts` (`track`, `trackEvent`)
- [ ] `backend/src/routes/metricsRoutes.ts` (`POST /metrics/track`, `POST /metrics/event`, `rateLimit`)
- [ ] `backend/src/middleware/requireMaster.ts`
- [ ] Registrar em `backend/src/app.ts`

### Etapa 3 — Backend Agregação (0,5 dia)

- [ ] `backend/src/controller/MasterMetricsController.ts` + `backend/src/routes/masterMetricsRoutes.ts` (`GET /master/metrics`)
- [ ] Agregações `byDay`/`bySource`/`funnel` + `trial` (reuso de `Company`)
- [ ] `backend/src/server.ts` — sem cron novo no MVP (diário é query, não job)

### Etapa 4 — Frontend Coleta (0,5 dia)

- [ ] `frontend/src/utils/metrics.ts` (`getVisitorId`, `trackPageView`, `trackEvent`)
- [ ] `frontend/src/pages/LandingPage.tsx:22` + CTAs (`:75`, `:198`) instrumentados
- [ ] `CompanySignupPage` — `signup_view`/`signup_success` (link `visitorId → companyId`)
- [ ] Testar com `curl` e DevTools `sendBeacon`

### Etapa 5 — Painel Master UI (1 dia)

- [ ] `frontend/src/pages/MasterDashboard.tsx` — estender com `DateRangePicker` + 4 KPI cards + Funnel + Recharts linha + tabela origem
- [ ] `frontend/src/services/masterMetricsService.ts` (fetch `GET /master/metrics`)
- [ ] `npm install recharts` (ou escolhido)
- [ ] Estados `loading/skeleton/error/empty`

### Etapa 6 — QA e Homolog (0,5 dia)

- [ ] `cd backend && npm run build` + `cd frontend && npm run build`
- [ ] Visitar `/page` 3x (anônimo), clicar CTA, criar empresa, checar `PageView`/`AnalyticsEvent` + `GET /master/metrics`
- [ ] Validar taxa conversão e funnel

### Etapa 7 — Produção

- [ ] `npx prisma migrate deploy`
- [ ] Monitorar `pino` + Resend não afetado
- [ ] Após 7 dias, avaliar alerta `>500 visitas <1%`

---

## 10. Testes e Validação

| Tipo | Onde | O que testar |
|------|------|--------------|
| Unit | `backend/src/services/metrics/*.test.ts` | `visitorId` hash, `byDay` agregação, `rate` cálculo |
| Integration | `backend/src/test/integration/metrics.test.ts` | `POST /metrics/track` grava `PageView`, `GET /master/metrics` exige `MASTER` |
| E2E | manual | `/page` → beacon → `PageView` → `MasterDashboard` exibe KPI |
| Build | `npm run build` backend + frontend | Sem regressão |
| LGPD | code review | Sem IP cru, cookie `SameSite`, retenção 90d |

---

## 11. Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| Adblock bloqueia `sendBeacon` | Fallback `fetch keepalive`; taxa ainda útil (erro sistemático) |
| Volume alto infla `PageView` | Debounce 30min + índice `createdAt`; limpeza 90d; sem `live` no MVP |
| `MASTER` vaza métricas | `requireMaster` + `MasterRoutes.tsx:20` já guardam; `GET` com `Cache-Control: private` |
| `visitorId` colide | `sha256(ip+salt+ua)` + `vid` uuid; colisão desprezível |
| Frontend sem `recharts` | Adicionar 1 dep; bundle +50kB aceitável |

---

## 12. Checklist Final

- [ ] `PageView` + `AnalyticsEvent` no `schema.prisma` + migrate
- [ ] `metricsProvider` + `MetricsController` + `metricsRoutes` (`POST /track`, `POST /event`)
- [ ] `MasterMetricsController` + `masterMetricsRoutes` (`GET /master/metrics`, `requireMaster`)
- [ ] `utils/metrics.ts` + `LandingPage.tsx` + CTAs instrumentados
- [ ] `CompanySignupPage` com `signup_view`/`signup_success`
- [ ] `MasterDashboard.tsx` com `DateRange`, 4 KPI cards, Funnel, Recharts linha, tabela origem
- [ ] `masterMetricsService.ts` + `recharts` instalado
- [ ] `npm run build` backend + frontend OK
- [ ] Homolog: visita → empresa → taxa exibida
- [ ] Retenção 90d integrada em `retentionCleanup`
- [ ] `PoliticaPrivacidade` menciona cookie `vid` anônimo (opcional)

---

## 13. Apêndice — Exemplos de Código

### `metricsProvider.ts`

```ts
export interface MetricsProvider {
  trackPageView(data: { path: string; referrer?: string; utmSource?: string; visitorId: string; userAgent?: string }): Promise<void>;
  trackEvent(data: { name: string; props?: Record<string, unknown>; visitorId?: string; companyId?: string }): Promise<void>;
  getMetrics(from: Date, to: Date): Promise<{ acquisition: {...}, conversion: {...}, funnel: {...}[] }>;
}
```

### `MasterDashboard` — fetch

```ts
const { data } = useQuery({
  queryKey: ["master-metrics", from, to],
  queryFn: () => masterMetricsService.getMetrics({ from, to }),
});
```

### `LandingPage` — beacon

```ts
useEffect(() => {
  const params = new URLSearchParams(location.search);
  trackPageView("/page", {
    referrer: document.referrer,
    utmSource: params.get("utm_source") ?? undefined,
  });
}, []);
```

---

> **Próximo passo:** implementar na ordem Etapa 1 → 6. Fase 2 (live 5min, `bySource` drill-down, export CSV, `MRR`/`Engajamento`) sob demanda após 7 dias de dados.
