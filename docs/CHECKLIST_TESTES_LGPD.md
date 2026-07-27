# Checklist de Testes — Conformidade LGPD (Sprints 1–5)

> **Gerado em:** 27/07/2026
> **Escopo:** Todas as funcionalidades LGPD implementadas no Viggo
> **Estimativa total:** ~5.5h de teste manual

---

## 1. FLUXO DE CADASTRO E CONSENTIMENTOS (Sprint 2 + T38)

| # | Teste | Como testar | Esperado |
|---|-------|-------------|----------|
| 1.1 | **Cadastro empresa** — `/company/signup` | Preencher todos os campos, marcar 3 checkboxes (Termos, Biometria, DPA), submeter | Cadastro OK, 4 Consentimento records criados (TERMOS_USO, POLITICA_PRIVACADE, BIOMETRIA, DPA) |
| 1.2 | **Cadastro empresa — checkboxes obrigatórios** | Tentar submeter sem marcar algum checkbox | Erro de validação, submissão bloqueada |
| 1.3 | **Cadastro empresa — desktop** | Testar scroll do formulário no desktop | Header "Criar conta da empresa" visível, scroll funciona |
| 1.4 | **Cadastro empresa — mobile** | Testar em viewport mobile | Banner verde compacto, formulário scrollável, header visível |
| 1.5 | **Aceite de convite** — `/accept-invite/:token` | Admin cria invite → funcionário abre link → marcar 3 checkboxes → submeter | Convite aceito, 4 Consentimento records criados, funcionário ACTIVE |
| 1.6 | **Aceite de convite — sem checkboxes** | Tentar aceitar sem marcar checkboxes | Erro de validação |

**Arquivos:** `CompanySignupPage.tsx`, `AcceptInvitePage.tsx`, `CompanyController.ts` (signup + acceptInvite)

---

## 2. CPF CRIPTOGRAFADO (T23 + T43)

| # | Teste | Como testar | Esperado |
|---|-------|-------------|----------|
| 2.1 | **Cadastro com CPF** | Cadastrar empresa com CPF válido | CPF salvo no DB como ciphertext AES-GCM (JSON `{v, ct, iv, tag}`), `cpfHash` salvo (SHA-256) |
| 2.2 | **CPF duplicado** | Tentar cadastrar outro usuário com mesmo CPF | Erro 400 — violação de `@unique` no `cpfHash` |
| 2.3 | **Consulta por CPF** | Login com email+senha | Funciona (bcrypt) |
| 2.4 | **AFD export com CPF** | Admin exporta AFD → abrir arquivo | CPF aparece formatado (xxx.xxx.xxx-xx), não como ciphertext |
| 2.5 | **Portal LGPD — CPF** | Funcionário acessa "Meus Dados" | CPF visível formatado, não ciphertext |

**Arquivos:** `cpfEncryption.ts`, `CompanyController.ts`, `AfdController.ts`, `PrivacyController.ts`

---

## 3. FACE DESCRIPTOR CRIPTOGRAFADO (T40)

| # | Teste | Como testar | Esperado |
|---|-------|-------------|----------|
| 3.1 | **Registro facial** | Funcionário cadastra face em `/register` | `faceDescriptor` salvo como JSON `{v, ct, iv, tag}`, `faceDescriptorUpdatedAt` = now() |
| 3.2 | **Validação facial (checkin)** | Bater ponto com face | Face decifrada internamente, comparação 128-dim funciona, checkin criado |
| 3.3 | **Token facial** | Admin gera token para funcionário via `/employees/face/token` | Token descartável emitido |
| 3.4 | **Dashboard — status face** | Admin vê lista de funcionários | `hasFaceDescriptor: true/false` (não o descriptor cru) |
| 3.5 | **`/auth/me`** | Qualquer usuário logado busca seus dados | `hasFaceDescriptor: boolean` (não o descriptor cru) |

**Arquivos:** `faceEncryption.ts`, `SessionController.ts`, `EmployeesController.ts`, `AuthController.ts`

---

## 4. DSAR — DIREITOS DO TITULAR (T27 + T41)

| # | Teste | Como testar | Esperado |
|---|-------|-------------|----------|
| 4.1 | **GET /privacy/my-data** | Funcionário acessa "Meus Dados" | Retorna dados pessoais, biométricos (hasFaceDescriptor), últimos 100 checkins, consentimentos |
| 4.2 | **PUT /privacy/my-data** | Funcionário edita nome e/ou email | Dados atualizados, `refreshUser()` chamado, toast sucesso |
| 4.3 | **PUT /privacy/my-data — email duplicado** | Tentar usar email de outro usuário | Erro 400 "Email já está em uso" |
| 4.4 | **GET /privacy/export** | Funcionário clica "Exportar Meus Dados (JSON)" | Download JSON com dados completos (pessoais, biométricos, checkins, consentimentos) |
| 4.5 | **DELETE /privacy/my-face** | Funcionário exclui biometria | `faceDescriptor = NULL`, `faceDescriptorUpdatedAt = NULL`, consentimento BIOMETRIA = false |
| 4.6 | **GET /privacy/my-logs** | Funcionário vê logs de acesso | Lista de AuditLog entries do usuário |

**Arquivos:** `PrivacyController.ts`, `privacyRoutes.ts`, `MeusDadosPage.tsx`, `api.ts`

---

## 5. AUDIT MIDDLEWARE GLOBAL (T42)

| # | Teste | Como testar | Esperado |
|---|-------|-------------|----------|
| 5.1 | **Auditoria — UPDATE** | Admin edita dados de funcionário | AuditLog com `oldData` (antes) e `newData` (depois) preenchidos |
| 5.2 | **Auditoria — DELETE** | Admin exclui face do funcionário | AuditLog com `oldData` preenchido |
| 5.3 | **Auditoria — LOGIN** | Usuário faz login | AuditLog com action=LOGIN, legalBasis mapeado |
| 5.4 | **Auditoria — CHECKIN** | Funcionário bate ponto | AuditLog com action=CHECKIN, categories incluem PONTO, GEOLOCALIZACAO, BIOMETRIA |
| 5.5 | **Auditoria — campos protegidos** | Verificar logs de entidades com CPF/face | CPF e faceDescriptor aparecem como `[REDACTED]` em oldData/newData |
| 5.6 | **Auditoria — sem autenticação** | Rota pública (health) | Nenhum AuditLog criado |

**Arquivos:** `AuditMiddleware.ts`, `app.ts`

---

## 6. POLÍTICA DE REVALIDAÇÃO BIOMÉTRICA — 2 ANOS (T44)

| # | Teste | Como testar | Esperado |
|---|-------|-------------|----------|
| 6.1 | **Verificar expiradas** | `GET /biometric-revalidation/expired` (MASTER) | Lista de usuários com face > 2 anos |
| 6.2 | **Purgar expiradas** | `POST /biometric-revalidation/purge-expired` (MASTER) | `faceDescriptor = NULL`, `faceDescriptorUpdatedAt = NULL`, consentimento BIOMETRIA = false |
| 6.3 | **Status biométrico** | `GET /biometric-revalidation/status/:userId` | `{ isExpired, expiresAt, daysUntilExpiry }` |
| 6.4 | **Proteção de rotas** | EMPLOYEE tenta acessar `/biometric-revalidation/expired` | Erro 403 (requireMaster) |
| 6.5 | **Novo registro zera timer** | Funcionário recadastra face | `faceDescriptorUpdatedAt` atualizado, `faceRevalidationNotifiedAt` = null |

**Arquivos:** `biometricRevalidation.ts`, `biometricRevalidationRoutes.ts`, `SessionController.ts`

---

## 7. TOLERÂNCIA CLT E HORÁRIOS (T22)

| # | Teste | Como testar | Esperado |
|---|-------|-------------|----------|
| 7.1 | **Checkin dentro da tolerância** | Bater ponto 3 min após horário agendado | Ajustado para horário agendado (tolerância 5 min) |
| 7.2 | **Checkin fora da tolerância** | Bater ponto 10 min após horário | Hora real registrada |
| 7.3 | **Adiantamento** | Bater ponto antes do horário agendado | Hora real registrada (sem tolerância para adiantamento) |
| 7.4 | **CRUD WorkSchedule** | Admin cria/edita/remove horário | Funciona, vinculado à empresa |

**Arquivos:** `toleranceCalculator.ts`, `CheckinController.ts`, `WorkScheduleController.ts`

---

## 8. ROTAS REMOVIDAS/LEGADAS (T39 + T46)

| # | Teste | Como testar | Esperado |
|---|-------|-------------|----------|
| 8.1 | **POST /sessions** | `curl -X POST /sessions` | 404 (rota removida) |
| 8.2 | **migrate-roles.ts** | `npx tsx scripts/migrate-roles.ts` | Script não existe mais |

**Arquivos:** `sessionRoutes.ts`, `migrate-roles.ts` (deletado)

---

## 9. FLUXOS DE NEGÓCIO INTEGRADOS

| # | Teste | Como testar | Esperado |
|---|-------|-------------|----------|
| 9.1 | **E2E: Cadastro → Login → Register Face → Checkin** | Fluxo completo | Tudo funciona, audit logs criados em cada etapa |
| 9.2 | **E2E: Invite → Accept → Register Face → Checkin** | Convite + onboarding | Consentimentos salvos, face registrada, checkin funciona |
| 9.3 | **E2E: Admin vê dados do funcionário** | Dashboard → lista funcionários | hasFaceDescriptor correto, dados exibidos |
| 9.4 | **E2E: Funcionário exporta dados** | Meus Dados → Exportar JSON | JSON válido com todos os campos |

---

## 10. SEGURANÇA

| # | Teste | Como testar | Esperado |
|---|-------|-------------|----------|
| 10.1 | **SQL Injection no CPF** | Enviar `'; DROP TABLE users;--` no campo CPF | Rejeitado pelo Zod schema |
| 10.2 | **XSS nos nomes** | Enviar `<script>alert(1)</script>` no campo nome | Escapeado, não executado |
| 10.3 | **Token expirado** | Usar JWT expirado | 401 Unauthorized |
| 10.4 | **Acesso cross-tenant** | EMPLOYEE da empresa A acessa dados da empresa B | 403 Forbidden |
| 10.5 | **Rate limiting** | Enviar 100+ requests rápidas | 429 Too Many Requests |

---

## Resumo de Prioridade

| Prioridade | Grupos | Esforço estimado |
|------------|--------|-----------------|
| **P0 — Crítico** | 1 (cadastro/consent), 3 (face crypto), 9.1–9.2 (E2E) | ~2h |
| **P1 — Alto** | 2 (CPF crypto), 4 (DSAR), 5 (audit), 9.3–9.4 | ~2h |
| **P2 — Médio** | 6 (revalidação), 7 (tolerância), 8 (rotas removidas), 10 (segurança) | ~1.5h |

---

## Observações

- **Ambiente necessário:** Backend rodando (`npm run dev`), Frontend rodando (`npm run dev`), PostgreSQL ativo via Docker
- **Variáveis de ambiente:** `CPF_ENCRYPTION_KEY` e `FACE_ENCRYPTION_KEY` devem estar configuradas no `.env`
- **Dados de teste:** Criar pelo menos 1 empresa (MASTER/ADMIN), 2 funcionários (EMPLOYEE), 1 horário de trabalho
- **Testes de criptografia:** Verificar diretamente no banco (`npx prisma studio`) para confirmar que dados sensíveis estão criptografados
- **Logs de auditoria:** Verificar tabela `AuditLog` no banco para confirmar que `oldData`/`newData` estão preenchidos em UPDATE/DELETE
