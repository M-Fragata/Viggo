# AGENTS.md - Guia Definitivo para IAs no Projeto Viggo

## Visão Geral do Projeto

**Viggo** - Aplicação full-stack com reconhecimento facial

### Backend (`backend/`)
- **Express 5** - Framework web
- **Prisma ORM** - Acesso ao banco PostgreSQL
- **Zod** - Validação de schemas
- **Pino** - Logging estruturado
- **Prometheus** - Métricas
- **Docker Compose** - Orquestração local (Postgres, Grafana, Prometheus)

### Frontend (`frontend/`)
- **React 19** + **Vite** + **TypeScript**
- **TailwindCSS v4** (via `@tailwindcss/vite`)
- **React Router v7** - Roteamento
- **React Hook Form + Zod** - Forms/validação
- **face-api.js + TensorFlow.js** - Reconhecimento facial
- **Framer Motion** - Animações
- **Sonner** - Toasts
- **ESLint + TypeScript ESLint** - Linting

---

## Estrutura de Diretórios

```
Viggo/
├── backend/
│   ├── src/
│   │   ├── app.ts              # Configuração do Express
│   │   ├── server.ts           # Entry point
│   │   ├── controller/         # Controllers (lógica de negócio)
│   │   ├── routes/             # Definição de rotas
│   │   ├── middleware/         # Middlewares (auth, error handling, etc)
│   │   ├── database/           # Configuração Prisma/client
│   │   ├── utils/              # Funções utilitárias
│   │   ├── @types/             # Type definitions globais
│   │   ├── scripts/            # Scripts auxiliares
│   │   └── test/               # Testes
│   ├── prisma/
│   │   └── schema.prisma       # Schema do banco
│   ├── dist/                   # Build output (gitignored)
│   ├── docker-compose.yml      # Serviços locais
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/         # Componentes UI reutilizáveis
│   │   ├── pages/              # Páginas (views)
│   │   ├── hooks/              # Custom hooks
│   │   ├── services/           # Chamadas API (axios/fetch)
│   │   ├── contexts/           # React Context (auth, theme, etc)
│   │   ├── routes/             # Configuração do React Router
│   │   ├── utils/              # Utilitários
│   │   ├── assets/             # Assets estáticos
│   │   ├── App.tsx             # Componente raiz
│   │   ├── main.tsx            # Entry point
│   │   └── index.css           # Estilos globais (Tailwind)
│   ├── public/                 # Assets públicos
│   ├── dist/                   # Build output (gitignored)
│   ├── vite.config.ts          # Config Vite
│   ├── tsconfig*.json          # Config TypeScript
│   ├── eslint.config.js        # Config ESLint
│   └── package.json
├── .github/                    # CI/CD workflows
└── AGENTS.md                   # Este arquivo
```

---

## Scripts Principais

### Backend (`backend/`)

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Inicia em modo desenvolvimento com hot-reload (tsx) |
| `npm run build` | Compila TypeScript para `dist/` |
| `npm start` | Executa build de produção |

### Frontend (`frontend/`)

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Inicia Vite dev server |
| `npm run build` | Typecheck + build de produção (`dist/`) |
| `npm run lint` | Executa ESLint |
| `npm run preview` | Preview do build de produção |

### Raiz do Projeto (`Viggo/`)

```bash
# Subir infraestrutura (Postgres, Grafana, Prometheus)
docker-compose -f backend/docker-compose.yml up -d

# Parar infraestrutura
docker-compose -f backend/docker-compose.yml down
```

---

## Convenções de Código

### Geral (Ambos)
- **TypeScript estrito** - `strict: true` em todos `tsconfig.json`
- **ES Modules** - `"type": "module"` nos package.json
- **Validação** - Schemas Zod compartilhados quando possível
- **Lint/Typecheck** - Sempre rodar antes de commit

### Backend Específico
- **Import paths** - Aliases `@/*` → `src/*` (configurado no tsconfig)
- **Erros** - Classes customizadas em `src/utils/errors/`
- **Logging** - Sempre usar `pino` (`src/utils/logger.ts`)

### Frontend Específico
- **Import paths** - Aliases `@/*` → `src/*` (configurado no tsconfig)
- **Estilos** - TailwindCSS v4 (diretivas em `index.css`)
- **Componentes** - Functional components + hooks
- **State** - React Context para estado global, hooks para local

---

## Banco de Dados (Backend)

- **Prisma Client** instanciado em `backend/src/database/prisma.ts`
- **Migrations**: `cd backend && npx prisma migrate dev`
- **Studio**: `cd backend && npx prisma studio`
- **Seed**: `cd backend && npx prisma db seed` (se configurado)

---

## Testes

### Backend
- Localização: `backend/src/test/`
- Executar: verificar script no `backend/package.json`

### Frontend
- Localização: `frontend/src/` (colocar junto aos arquivos ou pasta `__tests__`)
- Executar: verificar script no `frontend/package.json`

---

## Diretrizes Técnicas para o Ambiente Windows

### ❌ PROIBIDO: Caminhos Absolutos em Comandos de Terminal

**NUNCA** use caminhos absolutos do Windows (ex: `C:\Users\...`, `D:\Estudo\...`) em:
- Comandos `bash` executados via terminal
- Scripts npm/package.json
- Variáveis de ambiente
- Qualquer operação de arquivo via CLI

**Motivo**: Caminhos absolutos com backslash (`\`) causam erros de **JSON parsing** pois o backslash é caractere de escape em JSON. Isso quebra ferramentas, scripts e automações.

### ✅ OBRIGATÓRIO: Caminhos Relativos

**SEMPRE** use caminhos relativos a partir da raiz do projeto (`Viggo/`):

```bash
# ✅ CORRETO (a partir da raiz Viggo/)
ls backend/src/
cat frontend/package.json
cd backend && npm run dev

# ❌ ERRADO
ls D:\Estudo\Viggo\backend\src\
cat C:\Users\Mathe\Estudo\Viggo\frontend\package.json
```

### Regras Específicas

1. **Working Directory**: 
   - Raiz do projeto: `Viggo/`
   - Backend: `backend/` (para comandos npm/prisma)
   - Frontend: `frontend/` (para comandos npm/vite)

2. **File Operations** (read/write/edit/glob/grep): Use caminhos relativos à raiz
   - `backend/src/server.ts` ✅
   - `frontend/src/App.tsx` ✅
   - `D:\...\backend\src\server.ts` ❌

3. **Bash Commands**: Execute a partir da raiz (`Viggo/`) com paths relativos

4. **Environment Variables**: Em `.env`, use paths relativos ou variáveis como `__dirname`/`import.meta.url`

5. **Docker Volumes**: Em `docker-compose.yml`, use paths relativos (`./postgres_data:/var/lib/postgresql/data`)

### Exceções Permitidas

- Ferramentas que **exigem** path absoluto (ex: algumas APIs do VS Code) - documentar o motivo
- Configurações de IDE/editor que não afetam runtime

---

## Boas Práticas para IAs

1. **Leia antes de escrever** - Sempre use `read` antes de `edit`/`write`
2. **Verifique convenções** - Olhe arquivos existentes para seguir padrões
3. **Execute lint/typecheck** - Após mudanças, rode `npm run build` (e `npm run lint` no frontend)
4. **Commits atômicos** - Uma mudança lógica por commit (se solicitado commitar)
5. **Não assuma** - Se incerto sobre dependências/estrutura, pergunte ou explore primeiro
5. **Contexto correto** - Sempre especifique se está trabalhando em `backend/` ou `frontend/`

---

## Comandos de Verificação

### Backend
```bash
cd backend
npm run build        # Typecheck + build
npm run lint         # Se configurado (ou npx eslint .)
```

### Frontend
```bash
cd frontend
npm run build        # Typecheck + Vite build
npm run lint         # ESLint
```

### Projeto Completo
```bash
# Da raiz (Viggo/)
cd backend && npm run build
cd ../frontend && npm run build && npm run lint
```

---

*Este documento deve ser mantido atualizado conforme o projeto evolui.*