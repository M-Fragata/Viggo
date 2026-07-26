# Fluxo: Atualizar Face Descriptor - PUT /sessions/:userId

## Diagrama de Sequência

```mermaid
sequenceDiagram
    autonumber
    actor Client
    participant Express as Express App
    participant CORS as CORS Middleware
    participant Logger as LoggingMiddleware
    participant RateLimit as GeneralApiLimiter
    participant SessionRoute as Session Routes
    participant SessionCtrl as SessionController.update
    participant Prisma as Prisma Client
    participant DB as PostgreSQL

    Client->>Express: PUT /sessions/:userId {faceDescriptor: number[]}
    Express->>CORS: Verifica Origin
    CORS-->>Express: OK
    Express->>Logger: Log request
    Logger-->>Express: Next
    Express->>RateLimit: 100 req/min por IP
    RateLimit-->>Express: OK
    Express->>SessionRoute: Roteamento
    SessionRoute->>SessionCtrl: Chama controller.update(req, res)

    Note over SessionCtrl: Validação Params
    SessionCtrl->>SessionCtrl: paramsSchema.parse(req.params) - userId UUID
    alt UUID inválido
        SessionCtrl-->>Client: 400 {error: "Dados inválidos."}
    end

    Note over SessionCtrl: Validação Body
    SessionCtrl->>SessionCtrl: bodySchema.parse(req.body) - faceDescriptor: number[]
    alt faceDescriptor inválido/ausente
        SessionCtrl-->>Client: 400 {error: "Dados inválidos."}
    end

    SessionCtrl->>Prisma: user.findUnique({where: {id: userId}})
    Prisma->>DB: SELECT * FROM User WHERE id = ?
    DB-->>Prisma: User (ou null)
    alt Usuário não encontrado
        SessionCtrl-->>Client: 404 {error: "User not found"}
    end

    Note over SessionCtrl: Validação faceDescriptor
    SessionCtrl->>SessionCtrl: if (!faceDescriptor) return 404
    alt faceDescriptor vazio
        SessionCtrl-->>Client: 404 {error: "faceDescriptor not found"}
    end

    SessionCtrl->>Prisma: user.update({where: {id}, data: {faceDescriptor}})
    Prisma->>DB: UPDATE User SET faceDescriptor = ? WHERE id = ?
    DB-->>Prisma: User atualizado
    Prisma-->>SessionCtrl: User

    SessionCtrl-->>Client: 200 {message: "Face registrada com sucesso!"}
```

## Regras de Negócio

| Regra | Descrição | Código |
|-------|-----------|--------|
| **Validação UUID** | `userId` deve ser UUID válido | `z.uuid()` |
| **Face Descriptor Obrigatório** | Array de numbers obrigatório no body | `z.object({faceDescriptor: z.array(z.number())})` |
| **Usuário deve existir** | Busca por ID | `prisma.user.findUnique({where: {id: userId}})` |
| **Face Descriptor não vazio** | Verificação explícita `if (!faceDescriptor)` | `if (!faceDescriptor) return 404` |
| **Atualização Direta** | Sobrescreve `faceDescriptor` (Json field) | `prisma.user.update({data: {faceDescriptor}})` |

## Middlewares Aplicados (Ordem)

1. **CORS**
2. **LoggingMiddleware**
3. **GeneralApiLimiter** - 100 req/min por IP
4. **Roteamento** → SessionController.update

## Observações Importantes

⚠️ **SEM AUTENTICAÇÃO**: Rota **não passa por `authMiddleware`** - qualquer um com o userId pode atualizar o faceDescriptor de qualquer usuário.

⚠️ **SEM AUTORIZAÇÃO**: Não verifica se o usuário logado é o próprio usuário ou admin da empresa.

⚠️ **SEM RATE LIMIT ESPECÍFICO**: Apenas `generalApiLimiter` global.

⚠️ **SEM AUDITORIA**: Não usa `auditMiddleware` (não está nas rotas de session).

⚠️ **JWT INCOMPLETO**: Mesmo problema do login - não valida companyId.

## Riscos de Segurança

| Risco | Impacto | Mitigação Sugerida |
|-------|---------|-------------------|
| **Enumeration/Override** | Qualquer userId pode ter face alterada | Adicionar `authMiddleware` + verificação de ownership |
| **Face Spoofing** | Face descriptor pode ser injetado | Validar origem, adicionar challenge liveness |
| **Sem Auditoria** | Não há rastro de quem alterou | Adicionar `auditMiddleware` |