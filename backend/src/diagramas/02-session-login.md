# Fluxo: Login - POST /sessions/login

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
    participant AuthLimiter as AuthLimiter (20 req/15min)
    participant SessionCtrl as SessionController.login
    participant Prisma as Prisma Client
    participant DB as PostgreSQL

    Client->>Express: POST /sessions/login {email, password}
    Express->>CORS: Verifica Origin, Methods, Headers
    CORS-->>Express: OK
    Express->>Logger: Log request
    Logger-->>Express: Next
    Express->>RateLimit: Verifica limite 100 req/min por IP
    RateLimit-->>Express: OK
    Express->>SessionRoute: Roteamento
    SessionRoute->>AuthLimiter: Rate Limit específico de auth
    AuthLimiter->>AuthLimiter: Key: IP | Max: 20 | Window: 15min
    alt Limite excedido
        AuthLimiter-->>Client: 429 {message: "Muitas tentativas de login. Tente novamente em 15 minutos."}
    end
    AuthLimiter-->>SessionRoute: Next
    SessionRoute->>SessionCtrl: Chama controller.login(req, res)

    Note over SessionCtrl: Validação Zod
    SessionCtrl->>SessionCtrl: bodySchema.parse(req.body)
    alt Dados inválidos
        SessionCtrl-->>Client: 400 {message: "Dados inválidos", errors}
    end

    SessionCtrl->>Prisma: user.findUnique({where: {email}})
    Prisma->>DB: SELECT * FROM User WHERE email = ?
    DB-->>Prisma: User (ou null)
    alt Usuário não encontrado
        SessionCtrl-->>Client: 400 {message: "Email e/ou senha incorretos"}
    end

    Note over SessionCtrl: Verificação de senha (timing-safe)
    SessionCtrl->>Prisma: bcrypt.compare(password, user.password)
    Prisma-->>SessionCtrl: boolean
    alt Senha incorreta
        SessionCtrl-->>Client: 400 {message: "Email e/ou senha incorretos"}
    end

    Note over SessionCtrl: Geração JWT
    SessionCtrl->>SessionCtrl: jwt.sign({id, role}, JWT_SECRET, {expiresIn: "7d"})
    SessionCtrl-->>Client: 200 {user (sem password), token}
```

## Regras de Negócio

| Regra | Descrição | Código |
|-------|-----------|--------|
| **Validação de entrada** | Email válido, senha mínimo 6 chars | `z.object({email: z.email(), password: z.string().min(6)})` |
| **Usuário existe** | Busca por email único | `prisma.user.findUnique({where: {email}})` |
| **Verificação de senha** | bcrypt.compare (timing-safe) | `bcrypt.compare(password, user.password)` |
| **Mensagem genérica** | Mesmo erro para email inexistente ou senha errada (anti-enumeração) | `"Email e/ou senha incorretos"` |
| **JWT Payload** | `{id: user.id, role: user.role}` - **NÃO inclui companyId, planTier, isMaster** | `jwt.sign({id, role}, ...)` |
| **Token Expiração** | 7 dias | `{expiresIn: "7d"}` |
| **Resposta** | Remove password do objeto user | `const {password: _, ...userWithoutPassword} = user` |

## Middlewares Aplicados (Ordem)

1. **CORS** - Valida origin
2. **LoggingMiddleware** - Log request
3. **GeneralApiLimiter** - 100 req/min por IP
4. **AuthLimiter** - **Rate limit específico: 20 req/15min por IP**
5. **Roteamento** → SessionController.login

## Observações Importantes

⚠️ **JWT INCOMPLETO**: O token gerado aqui **NÃO inclui** `companyId`, `planTier`, `isMaster`. Isso causa problemas no `AuthMiddleware` que espera esses campos. O fluxo correto de login multi-tenant deveria buscar a empresa do usuário e incluir no token.

⠀⚠️ **Rate Limit por IP**: Usa IP como chave (`req.ip ?? 'unknown'`), não por usuário (ainda não autenticado).

⚠️ **Anti-Timing Attack**: `bcrypt.compare` é timing-safe nativamente.

⚠️ **Sem verificação de status da empresa**: Não verifica se empresa está SUSPENDED, CANCELLED ou TRIAL_EXPIRED.