# Fluxo: Signup Multi-Tenant (Empresa + Admin) - POST /companies/signup

## Diagrama de Sequência

```mermaid
sequenceDiagram
    autonumber
    actor Client
    participant Express as Express App
    participant CORS as CORS Middleware
    participant Logger as LoggingMiddleware
    participant RateLimit as GeneralApiLimiter
    participant CompanyRoute as Company Routes
    participant CompanyCtrl as CompanyController.signup
    participant Prisma as Prisma Client
    participant DB as PostgreSQL
    participant JWT as jsonwebtoken
    participant Bcrypt as bcrypt
    participant Validator as cpfCnpjValidator

    Client->>Express: POST /companies/signup {name, email, cpf, cnpj?, companyName, password, confirmPassword}
    Express->>CORS: Verifica Origin
    CORS-->>Express: OK
    Express->>Logger: Log request
    Logger-->>Express: Next
    Express->>RateLimit: 100 req/min
    RateLimit-->>Express: OK
    Express->>CompanyRoute: Roteamento (PÚBLICO - sem authMiddleware)

    CompanyRoute->>CompanyCtrl: Chama controller.signup(req, res)

    Note over CompanyCtrl: Validação Zod
    CompanyCtrl->>CompanyCtrl: bodySchema.parse(req.body)
    alt Dados inválidos
        CompanyCtrl-->>Client: 400 {message: "Dados inválidos", errors}
    end

    Note over CompanyCtrl: Senhas conferem
    CompanyCtrl->>CompanyCtrl: password === confirmPassword
    alt Diferentes
        CompanyCtrl-->>Client: 400 {message: "Senhas não conferem"}
    end

    Note over CompanyCtrl: Valida CPF (dígito verificador)
    CompanyCtrl->>Validator: validateDocument(cpf)
    Validator-->>CompanyCtrl: {valid, formatted}
    alt CPF inválido
        CompanyCtrl-->>Client: 400 {message: "CPF inválido"}
    end

    Note over CompanyCtrl: Valida CNPJ (se informado)
    alt cnpj informado
        CompanyCtrl->>Validator: validateDocument(cnpj)
        alt CNPJ inválido
            CompanyCtrl-->>Client: 400 {message: "CNPJ inválido"}
        end
    end

    Note over CompanyCtrl: Verifica unicidades (paralelo)
    par Unicidades
        CompanyCtrl->>Prisma: user.findUnique({where: {email}})
        CompanyCtrl->>Prisma: user.findUnique({where: {cpf: cpfFormatted}})
        alt cnpj informado
            CompanyCtrl->>Prisma: company.findUnique({where: {cnpj: cnpjFormatted}})
        end
    end
    alt Email já existe
        CompanyCtrl-->>Client: 400 {message: "Email já cadastrado"}
    end
    alt CPF já existe
        CompanyCtrl-->>Client: 400 {message: "CPF já cadastrado"}
    end
    alt CNPJ já existe
        CompanyCtrl-->>Client: 400 {message: "CNPJ já cadastrado"}
    end

    Note over CompanyCtrl: Hash senha
    CompanyCtrl->>Bcrypt: hash(password, 10)
    Bcrypt-->>CompanyCtrl: passwordHash

    Note over CompanyCtrl: Cria Empresa (TRIAL 30 dias, TIER_I)
    CompanyCtrl->>Prisma: company.create({
        name: companyName,
        cnpj: formatted,
        plan: TIER_I,
        status: TRIAL,
        maxEmployees: 10,
        planExpiresAt: +30 dias,
        trialUsed: true,
        settings: {}
    })
    Prisma->>DB: INSERT INTO Company
    DB-->>Prisma: Company

    Note over CompanyCtrl: Cria Admin (ENTERPRISE_ADMIN)
    CompanyCtrl->>Prisma: user.create({
        name, email, passwordHash,
        cpf: cpfFormatted,
        role: ENTERPRISE_ADMIN,
        companyId: company.id
    })
    Prisma->>DB: INSERT INTO User
    DB-->>Prisma: User

    Note over CompanyCtrl: Cria Subscription TRIAL
    CompanyCtrl->>Prisma: subscription.create({
        companyId: company.id,
        planTier: TIER_I,
        price: 0,
        status: TRIAL,
        expiresAt: +30 dias
    })
    Prisma->>DB: INSERT INTO Subscription

    Note over CompanyCtrl: Gera JWT completo
    CompanyCtrl->>JWT: sign({id, role, companyId, planTier: company.plan, isMaster: false}, JWT_SECRET, {expiresIn: "7d"})
    JWT-->>CompanyCtrl: token

    CompanyCtrl-->>Client: 201 {user, company, token}
```

## Regras de Negócio

| Regra | Descrição | Código |
|-------|-----------|--------|
| **Rota Pública** | Não requer autenticação | Rota fora do `companyRoutes.use(authMiddleware)` |
| **Validação Completa** | Zod: name, email, cpf, cnpj(opcional), companyName, password(8+), confirmPassword | `z.object({...})` |
| **Senhas Conferem** | password === confirmPassword | `if (password !== confirmPassword)` |
| **CPF Válido** | Algoritmo dígito verificador + formatação | `validateDocument(cpf)` |
| **CNPJ Válido** | Se informado, algoritmo dígito verificador | `validateDocument(cnpj)` |
| **Unicidade Email** | Global (todas empresas) | `user.findUnique({where: {email}})` |
| **Unicidade CPF** | Global (todas empresas) | `user.findUnique({where: {cpf}})` |
| **Unicidade CNPJ** | Global (todas empresas) | `company.findUnique({where: {cnpj}})` |
| **Empresa Criada** | TRIAL, 30 dias, TIER_I, maxEmployees: 10 | `plan: TIER_I, status: TRIAL, maxEmployees: 10` |
| **Admin Criado** | Role ENTERPRISE_ADMIN, vinculado à empresa | `role: ENTERPRISE_ADMIN, companyId: company.id` |
| **Subscription TRIAL** | Histórico de plano, price: 0, 30 dias | `subscription.create({status: TRIAL, price: 0})` |
| **JWT Completo** | Inclui companyId, planTier, isMaster | `jwt.sign({id, role, companyId, planTier, isMaster})` |

## Middlewares Aplicados (Ordem)

1. **CORS**
2. **LoggingMiddleware**
3. **GeneralApiLimiter** - 100 req/min
4. **Roteamento** → CompanyController.signup (**SEM authMiddleware**)

## Observações Importantes

✅ **Rota Pública**: Acessível sem token - entrypoint do SaaS.

✅ **Validação Robusta**: CPF/CNPJ com dígito verificador impede fraudes básicas.

✅ **Unicidades Globais**: Email, CPF, CNPJ únicos em todo sistema (não por empresa).

✅ **Trial Automático**: 30 dias, TIER_I, 10 funcionários - pronto para uso imediato.

✅ **JWT Completo**: Diferente do login legacy, inclui `companyId`, `planTier`, `isMaster`.

⚠️ **Sem Rate Limit Específico**: Apenas `generalApiLimiter` - vulnerável a spam de signup.

⚠️ **Senha Mínimo 8 chars**: Mais forte que login legacy (6 chars).

⚠️ **Empresa Hardcoded no Legacy**: Login antigo usa `companyId: "1"`, este cria empresa nova.

## Fluxo Pós-Signup (Frontend)

```
1. Usuário preenche form no landing page
2. POST /companies/signup
3. Recebe {user, company, token}
4. Armazena token no localStorage
4. Redireciona para /admin (dashboard empresa)
5. Dashboard carrega com trial de 30 dias ativo
```
