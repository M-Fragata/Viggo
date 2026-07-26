# Fluxo: Cadastro de Usuário (Legado) - POST /sessions

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
    participant AuthLimiter as AuthLimiter (NÃO aplicado aqui)
    participant SessionCtrl as SessionController.create
    participant Prisma as Prisma Client
    participant DB as PostgreSQL

    Client->>Express: POST /sessions {name, email, password, confirmPassword}
    Express->>CORS: Verifica Origin, Methods, Headers
    CORS-->>Express: OK
    Express->>Logger: Log request (method, url, ip, user-agent)
    Logger-->>Express: Next
    Express->>RateLimit: Verifica limite 100 req/min por IP
    RateLimit-->>Express: OK (ou 429)
    Express->>SessionRoute: Roteamento para /sessions
    SessionRoute->>SessionCtrl: Chama controller.create(req, res)

    Note over SessionCtrl: Validação Zod
    SessionCtrl->>SessionCtrl: bodySchema.parse(req.body)
    alt Dados inválidos
        SessionCtrl-->>Client: 400 {message: "Dados inválidos", errors}
    end
    Note over SessionCtrl: Verifica senhas conferem
    SessionCtrl->>SessionCtrl: password === confirmPassword
    alt Senhas diferentes
        SessionCtrl-->>Client: 400 {message: "Senhas diferentes"}
    end

    SessionCtrl->>Prisma: bcrypt.hash(password, 10)
    Prisma-->>SessionCtrl: passwordHash

    SessionCtrl->>Prisma: company.findUnique({where: {id: "1"}})
    Prisma->>DB: SELECT * FROM Company WHERE id = '1'
    DB-->>Prisma: Company (ou null)
    alt Company não encontrada
        SessionCtrl-->>Client: 500 {message: "Empresa não encontrada"}
    end

    SessionCtrl->>Prisma: user.create({name, email, passwordHash, companyId: "1"})
    Prisma->>DB: INSERT INTO User ...
    DB-->>Prisma: User criado
    Prisma-->>SessionCtrl: User

    SessionCtrl-->>Client: 201 {user}
```

## Regras de Negócio

| Regra | Descrição | Código |
|-------|-----------|--------|
| **Validação de entrada** | Nome mínimo 3 chars, email válido, senha mínimo 6 chars | `z.object({name: z.string().min(3), email: z.email(), password: z.string().min(6)})` |
| **Confirmação de senha** | `password` deve ser igual a `confirmPassword` | `if (password !== confirmPassword)` |
| **Empresa padrão** | Usuário sempre vinculado à empresa com `id: "1"` (hardcoded) | `prisma.company.findUnique({where: {id: "1"}})` |
| **Hash de senha** | bcrypt com cost 10 | `bcrypt.hash(password, 10)` |
| **Erro Zod** | Retorna 400 com detalhes dos campos inválidos | `error instanceof z.ZodError` |
| **Rate Limit Global** | 100 requisições por minuto por IP (aplicado no app.ts) | `generalApiLimiter` |

## Middlewares Aplicados (Ordem)

1. **CORS** - Valida origin, methods, headers permitidos
2. **LoggingMiddleware** - Loga request (method, url, ip, user-agent, timestamp)
3. **GeneralApiLimiter** - 100 req/min por IP (keyGenerator: IP)
4. **Roteamento** - `/sessions` → SessionController.create

## Observações Importantes

⚠���⚠️ **DEPRECADO**: Este endpoint cria usuário na empresa hardcoded `id: "1"`. O fluxo correto de signup multi-tenant é `POST /companies/signup` que cria empresa + admin juntos.

⠀⚠️ **Sem autenticação**: Rota pública, não passa por `authMiddleware`.

⠀⚠️ **Sem rate limit específico**: Não usa `authLimiter` (apenas o global `generalApiLimiter`).