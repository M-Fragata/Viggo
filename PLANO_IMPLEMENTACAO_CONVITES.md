# Plano de Implementação: Tokens de Convite Genéricos

## Visão Geral
Substituir o sistema atual de convites por email específico por **tokens genéricos da empresa**. O admin gera um link rastreável, compartilha, e qualquer pessoa que acessar pode se registrar na empresa (role padrão: `EMPLOYEE`).

---

## 1. Backend - Banco de Dados (Prisma)

### Schema Atualizado

```prisma
model InviteToken {
  id              String    @id @default(uuid())
  companyId       String
  company         Company   @relation(fields: [companyId], references: [id])
  token           String    @unique
  maxUses         Int?      // Opcional: null = ilimitado (futuro: convites personalizados)
  currentUses     Int       @default(0)
  expiresAt       DateTime
  revokedAt       DateTime?
  createdAt       DateTime  @default(now())
  usedByUsers     InviteTokenUsage[]
  
  @@index([companyId])
}

model InviteTokenUsage {
  id             String      @id @default(uuid())
  inviteTokenId  String
  inviteToken    InviteToken @relation(fields: [inviteTokenId], references: [id], onDelete: Cascade)
  userId         String
  user           User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt      DateTime    @default(now())
  
  @@unique([inviteTokenId, userId])
  @@index([inviteTokenId])
  @@index([userId])
}
```

**Decisões:**
- `maxUses` opcional (`Int?`), null = ilimitado (padrão atual)
- Tabela separada `InviteTokenUsage` para rastrear quem usou o token
- `revokedAt` para soft delete (revogação)
- Compatibilidade: não há convites antigos para migrar

---

## 2. Backend - CompanyController.ts

### Métodos Atualizados

| Método | Descrição |
|--------|-----------|
| `createInviteToken` | `POST /me/invite-token` - Body: `expiresInDays?` (default 7), `maxUses?`. Retorna token completo, inviteUrl, maxUses, expiresAt |
| `listInviteTokens` | `GET /me/invite-tokens` - Retorna lista com: id, tokenMasked, maxUses, currentUses, expiresAt, revokedAt, createdAt, isActive, usedByUsers[] |
| `revokeInviteToken` | `DELETE /me/invite-tokens/:id` - Soft delete: seta `revokedAt = now()` |
| `getInviteByToken` | `GET /invites/:token` (público) - Retorna: company, expiresAt, maxUses, currentUses |
| `acceptInvite` | `POST /invites/accept` - Body adiciona `email` (required). Cria user (role=EMPLOYEE) + registro em `InviteTokenUsage` + incrementa `currentUses` |

### Validações no Aceite
1. Token existe + não revogado + não expirado
2. Se `maxUses !== null`: `currentUses < maxUses`
3. Email não cadastrado globalmente
4. Transação: cria user + `InviteTokenUsage` + incrementa `currentUses`

---

## 3. Backend - Rotas (companyRoutes.ts)

```typescript
// Protegidas (admin + employee limit check)
POST   /me/invite-token          // createInviteToken
GET    /me/invite-tokens         // listInviteTokens
DELETE /me/invite-tokens/:id     // revokeInviteToken

// Públicas
GET    /invites/:token           // getInviteByToken
POST   /invites/accept           // acceptInvite
```

---

## 4. Frontend - Tipos e Endpoints (api.ts)

```typescript
// DTOs
interface CreateInviteTokenDto {
  expiresInDays?: number;  // default 7
  maxUses?: number;        // opcional, null = ilimitado
}

// Responses
interface InviteTokenResponse {
  id: string;
  token: string;           // só na criação
  tokenMasked: string;     // "abc123..."
  inviteUrl: string;
  maxUses: number | null;  // null = ilimitado
  currentUses: number;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
  isActive: boolean;
  usedByUsers: {
    id: string;
    name: string;
    email: string;
    createdAt: string;
  }[];
}

interface PublicInviteResponse {
  company: { id, name, plan, settings };
  expiresAt: string;
  maxUses: number | null;
  currentUses: number;
}

interface AcceptInviteDto {
  token: string;
  email: string;           // NOVO: obrigatório
  name: string;
  password: string;
  confirmPassword: string;
}
```

---

## 5. Frontend - Hooks

### Novo: `useInviteTokens.ts`
```typescript
export function useInviteTokens() {
  const [tokens, setTokens] = useState<InviteTokenResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  // fetchTokens(), createToken(), revokeToken()
}

export function usePublicInvite() {
  // fetchInvite() retorna PublicInviteResponse (sem email/role)
  // acceptInvite() recebe email no payload
}
```

---

## 6. Frontend - Componentes

### `InvitesTab.tsx` - Principais Mudanças
- **Remove**: `InviteModal`, `showInviteModal`, campos email/role
- **Adiciona**: 
  - Botão **"Gerar Link de Convite"** → chama `createInviteToken()`
  - Exibição do link gerado: **card inline** com botão copiar + seta expansível
  - `InviteTokenTable` no lugar de `InviteTable`

### Novo `InviteTokenTable.tsx` - Card Expansível

**Linha da Tabela:**
```
| Token (mascarado) | Criado em | Expira em | Usos (atual/máx) | Status | Ações |
| a1b2c3d4...       | 24/06     | 01/07     | 2 / ∞            | 🟢 Ativo | [Copiar] [▼] [Revogar] |
```

**Card Expansível (clique na seta ▼):**
```
┌─────────────────────────────────────────────────────┐
│ Link: https://app.com/accept-invite/a1b2c3d4...  [📋 Copiar] │
├─────────────────────────────────────────────────────┤
│ Funcionários que usaram este token:                 │
│ • João Silva (joao@email.com) — 24/06 14:30        │
│ • Maria Santos (maria@email.com) — 25/06 09:15     │
└─────────────────────────────────────────────────────┘
```

### `AcceptInvitePage.tsx` - Mudanças
- **Schema**: Adiciona `email: z.email()` (obrigatório)
- **Form**: 
  - Email: input editável (required)
  - Remove campo role (fixo "Funcionário" no display)
  - Display mostra: "Cargo: Funcionário" (não editável)
- **Submit**: Envia `email` no `acceptInvite`
- **Redirect**: Após sucesso, role=EMPLOYEE → redirect para `/` (página de ponto)

---

## 7. Fluxo de Uso

```
1. Admin acessa aba "Convites"
2. Clica "Gerar Link de Convite"
3. Backend cria token (companyId vem do auth do admin) → retorna inviteUrl (ex: app.com/accept-invite/xyz789)
4. Frontend mostra card inline: link + botão copiar + seta ▼
5. Admin compartilha link (WhatsApp, email, etc)
6. Candidato clica → AcceptInvitePage carrega empresa + expiração
7. Candidato preenche: Email, Nome, Senha, Confirmar Senha
8. Submit → Backend valida, cria user (role=EMPLOYEE), registra uso, incrementa currentUses
9. Redirect para "/" (página de ponto/checkin - role EMPLOYEE)
10. Na aba Convites: token mostra "1/∞" uso, card expansível mostra o novo funcionário
```

---

## 8. Configurações Padrão

| Configuração | Valor |
|--------------|-------|
| Validade do token | 7 dias |
| Max usos | Ilimitado (null) |
| Role padrão | EMPLOYEE |
| Exibição link gerado | Card inline expansível |
| Redirect pós-aceite | `/` (página de ponto) |

---

## 9. Arquivos a Criar/Modificar

### Backend
| Arquivo | Ação |
|---------|------|
| `backend/prisma/schema.prisma` | Add fields em `InviteToken` + model `InviteTokenUsage` |
| `backend/src/controller/company/CompanyController.ts` | Refatorar métodos de invite |
| `backend/src/routes/companyRoutes.ts` | Atualizar rotas |

### Frontend
| Arquivo | Ação |
|---------|------|
| `frontend/src/services/api.ts` | Novos tipos + endpoints |
| `frontend/src/hooks/useInviteTokens.ts` | Novo hook (substitui useInvites) |
| `frontend/src/components/company/InviteTokenTable.tsx` | Novo componente com card expansível |
| `frontend/src/components/company/InvitesTab.tsx` | Refatorar aba |
| `frontend/src/components/company/AcceptInvitePage.tsx` | Add campo email |
| `frontend/src/pages/DashboardPage.tsx` | Importar novo hook/tab |

---

## 10. Checklist de Implementação

- [x] Migration Prisma (`InviteToken` + `InviteTokenUsage`)
- [x] Controller: create, list, revoke, getByToken, accept
- [x] Rotas protegidas (admin) + públicas
- [x] Tipos TypeScript + endpoints api.ts
- [x] Hook `useInviteTokens`
- [x] `InviteTokenTable` com card expansível
- [x] `InvitesTab` integrado
- [x] `AcceptInvitePage` com campo email
- [x] Testes manuais: gerar → copiar → acessar → registrar → ver uso na tabela

---

## 11. Decisões Registradas

1. **Validade**: 7 dias (padrão)
2. **Max usos**: Ilimitado (null), opcional para futuro
3. **UI link gerado**: Card inline com botão copiar + expansível
4. **Dados no card expansível**: Nome, email, data de uso (suficiente)
5. **Migração**: Implementação nova, sem convites antigos
6. **Role**: Fixa `EMPLOYEE` no aceite, admin altera depois se necessário
7. **companyId no token**: Vem do auth do admin logado (não do body)
8. **Redirect pós-aceite**: `/` para EMPLOYEE (página de ponto/checkin)