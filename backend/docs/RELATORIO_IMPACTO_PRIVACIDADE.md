# Relatório de Impacto à Proteção de Dados Pessoais (RIPD)

**Produto:** Viggo — Registrador Eletrônico de Ponto por Programa (REP-P)
**Empresa Responsável:** Viggo Tecnologia em Registro de Ponto Ltda.
**Versão:** 1.0
**Data de Elaboração:** 23 de julho de 2026
**DPO:** dpo@viggo.com.br
**Base Legal:** LGPD Art. 38, §1º — Lei nº 13.709/2018

---

## 1. Descrição do Tratamento

### 1.1. Finalidade

O Viggo realiza o tratamento de dados pessoais para fins de:
- **Registro de ponto eletrônico** com reconhecimento facial (obrigação legal — CLT Art. 74);
- **Validação de identidade** do trabalhador no ato da marcação;
- **Geração de relatórios** (AFD, folha mensal) conforme Portaria MTE 671/2021;
- **Cumprimento de obrigações** trabalhistas, previdenciárias e fiscais.

### 1.2. Dados Tratados

| Categoria | Dados | Classificação | Base Legal |
|-----------|-------|---------------|------------|
| **Cadastrais** | Nome, e-mail, CPF | Dado pessoal | Art. 7º, V (contrato) + Art. 11, II, "a" (obrigação legal) |
| **Biométricos** | Vetor facial (128 floats) | Dado pessoal sensível | Art. 11, I (consentimento específico) |
| **Geolocalização** | Latitude, longitude | Dado pessoal | Art. 7º, V (contrato) |
| **Jornada** | Entrada, saída, intervalos, NSR | Dado pessoal | Art. 11, II, "a" (obrigação legal) |
| **Consentimentos** | Tipo, versão, data, IP | Dado pessoal | Art. 7º, I (consentimento) |
| **Auditoria** | Logs de operações, IP, User-Agent | Dado pessoal | Art. 7º, II (obrigação legal/regulatória) |

### 1.3. Titulares dos Dados

- **Funcionários** (EMPLOYEE): dados biométricos, jornada, cadastrais
- **Administradores** (ENTERPRISE_ADMIN): dados cadastrais
- **Sócio-administradores**: dados cadastrais + CNPJ

---

## 2. Avaliação de Riscos

### 2.1. Identificação de Riscos

| # | Risco | Probabilidade | Impacto | Nível |
|---|-------|---------------|---------|-------|
| R1 | Vazamento de descriptors faciais | Baixa | Crítico | **Alto** |
| R2 | Acesso não autorizado a dados de ponte | Média | Alto | **Alto** |
| R3 | Perda de registros de ponto | Baixa | Crítico | **Alto** |
| R4 | Exposição de CPF em trânsito | Baixa | Médio | **Médio** |
| R5 | Falta de consentimento para biometria | Baixa | Crítico | **Médio** |
| R6 | Geolocalização exposta indevidamente | Baixa | Médio | **Médio** |
| R7 | Cross-tenant data leak | Baixa | Crítico | **Alto** |
| R8 | Falha no serviço durante jornada | Média | Alto | **Alto** |

### 2.2. Análise Detalhada por Risco

#### R1 — Vazamento de Descriptors Faciais

**Cenário:** Atacante obtém acesso ao banco de dados e extrai os vetores biométricos.

**Impacto:** Impossível reconstruir imagem facial (irreversível), mas vetor pode ser usado para ataque de replay em outros sistemas.

**Controles existentes:**
- Descriptor armazenado como JSON, nunca como imagem
- Token de uso único (TTL 30s) para comparação facial (F11.b)
- Endpoint `/employees/face` removido — descriptor nunca retorna ao client
- Criptografia em trânsito (TLS/HSTS — F12)
- Isolamento por multi-tenancy (companyId em todas as queries)

**Controles adicionais recomendados:**
- Criptografia do descriptor em repouso (AES-256)
- Monitoramento de acesso à tabela `User.faceDescriptor`

#### R3 — Perda de Registros de Ponto

**Cenário:** Falha no banco de dados resulta em perda de CheckIns.

**Impacto:** Perda de prova de jornada — empresa exposta a multas MTE e ações trabalhistas.

**Controles existentes:**
- Backup diário do PostgreSQL
- AFD exportável com hash SHA-256 de integridade
- Relatório mensal com hash SHA-256 (F20)
- Script de retenção (`retentionCleanup.ts`) preserva dados 5 anos (F19)

**Controles adicionais recomendados:**
- Backup diário off-site (F21 — em andamento)
- Verificação periódica de integridade dos hashes

#### R7 — Cross-Tenant Data Leak

**Cenário:** Bug no código permite que um usuário acesse dados de outra empresa.

**Impacto:** Exposição massiva de dados pessoais — risco crítico LGPD.

**Controles existentes:**
- `extendedPrisma` injeta `companyId` automaticamente em todas as queries
- `AsyncLocalStorage` garante contexto por request
- Testes de isolamento no CI

---

## 3. Medidas de Mitigação Implementadas

| # | Medida | Finding | Status |
|---|--------|---------|--------|
| M1 | Token descartável para comparação facial (não expõe descriptor) | F11.b | ✅ Implementado |
| M2 | Helmet + HSTS em todas as respostas HTTP | F12 | ✅ Implementado |
| M3 | Multi-tenancy por `AsyncLocalStorage` + `companyId` em todas queries | — | ✅ Implementado |
| M4 | Rate limiting diferenciado (API geral, checkin, face) | — | ✅ Implementado |
| M5 | AuditLog completo com IP, User-Agent, legalBasis | F24 | ✅ Implementado |
| M6 | Políticas de retenção e eliminação automática | F19 | ✅ Implementado |
| M7 | Consentimento específico para biometria | F10 | ✅ Implementado |
| M8 | Criptografia de CPF em repouso | F12 (T23) | ❌ Pendente |
| M9 | Backup AFD criptografado off-site | F21 | ❌ Pendente |

---

## 4. Conclusão

O Viggo implementa a maioria das medidas de segurança exigidas pela LGPD para o tratamento de dados biométricos em contexto trabalhista. Os riscos residuais são considerados **aceitáveis** dado o conjunto de controles técnicos implementados.

**Pontos de atenção:**
1. Criptografia de CPF em repouso (T23) — pendente, recomendado implementar antes do lançamento comercial
2. Backup AFD criptografado (F21) — pendente, obrigatório pela Portaria 671 Art. 81
3. Certificado ICP-Brasil (F1) — bloqueante para homologação MTE, mas não afeta proteção de dados

**Nível de risco residual:** **Médio** — aceitável com as mitigações existentes.

---

## 5. Aprovação

| Função | Nome | Data | Assinatura |
|--------|------|------|------------|
| DPO | [A definir] | ___/___/______ | _____________ |
| CEO / Diretor | [A definir] | ___/___/______ | _____________ |
| CTO / Engineering Lead | [A definir] | ___/___/______ | _____________ |

---

*Este documento deve ser revisado anualmente ou sempre que houver mudança significativa no tratamento de dados.*
