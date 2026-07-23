# Política de Retenção e Eliminação de Dados

**Versão:** 1.0
**Data de Vigência:** 23 de julho de 2026
**Responsável:** DPO — dpo@viggo.com.br

---

## 1. Objetivo

Esta política define os prazos de retenção e as regras de eliminação dos dados pessoais
tratados pelo Viggo (software SaaS de registro de ponto eletrônico), em conformidade com:

- **LGPD** (Lei nº 13.709/2018) — Arts. 15, 16 e 17
- **CLT** (Consolidação das Leis do Trabalho) — Art. 74, §4º
- **Portaria MTE nº 671/2021** — Art. 81

---

## 2. Classificação dos Dados e Prazos de Retenção

| Tipo de Dado | Prazo de Retenção | Base Legal | Justificativa |
|---|---|---|---|
| `User.faceDescriptor` (vetor biométrico) | Enquanto vínculo ativo + **30 dias** após desligamento | LGPD Art. 15 + Minimização | Dado sensível — eliminar o mais rápido possível após cessar finalidade |
| `CheckIn` (registros de ponto) | **5 anos** a partir do encerramento do exercício trabalhista | CLT Art. 74, §4º | Obrigação legal de manter registros por 5 anos para fins de auditoria MTE |
| `Consentimento` (registros de aceite) | Enquanto vínculo ativo + **1 ano** após desligamento | LGPD Art. 15 + Arts. 7º/11 | Comprovar base legal do tratamento durante vigência + prazo residual |
| `InviteToken` revogados | **90 dias** após revogação | LGPD Art. 15 — Minimização | Tokens inutilizados não devem permanecer armazenados |
| `InviteTokenUsage` | **1 ano** após uso | LGPD Art. 15 | Rastro de auditoria do convite |
| `AuditLog` (trilha de auditoria) | **5 anos** | LGPD Art. 37 + LGPD Art. 16 | Segurança e auditoria ANPD |
| `Subscription` | **5 anos** após cancelamento | Obrigação fiscal/contábil | Documentação de receita e cancelamentos |
| `Company` (dados cadastrais) | Enquanto conta ativa | LGPD Art. 15 | Necessário para operação do serviço |
| `Logs de sistema` (erros, performace) | **180 dias** | Interesse legítimo — operação | Manutenção e diagnóstico técnico |

---

## 3. Regras de Eliminação

### 3.1. Eliminação Automática (Job Diário — 02:00)

| Regra | Condição | Ação |
|---|---|---|
| **Descriptor facial** | `User.status = INACTIVE` AND `User.deactivatedAt < (agora - 30 dias)` AND `User.faceDescriptor IS NOT NULL` | `SET faceDescriptor = NULL` |
| **Checkins antigos** | `CheckIn.createdAt < (agora - 5 anos)` | `DELETE` |
| **Tokens revogados** | `InviteToken.revokedAt IS NOT NULL` AND `InviteToken.revokedAt < (agora - 90 dias)` | `DELETE` (cascade para usos) |

### 3.2. Eliminação por Solicitação (DSAR — Art. 18 LGPD)

Quando um titular solicita a eliminação de dados:

1. **Verificar existência de obrigação legal de retenção** (CLT Art. 74: checkins de ponto)
2. **Eliminar dados não sujeitos a retenção legal**: faceDescriptor, dados cadastrais não essenciais
3. **Manter dados sujeitos a retenção legal**: CheckIn (até 5 anos), AuditLog (até 5 anos)
4. **Registrar a solicitação** no AuditLog com ação `DSAR_DELETE_REQUEST`
5. **Notificar o titular** do que foi eliminado e do que foi retido (e por quê)

### 3.3. Eliminação por Desligamento

Quando um funcionário é desligado (status alterado para `INACTIVE`):

1. Marcar `deactivatedAt = agora`
2. O job diário removerá o `faceDescriptor` após 30 dias
3. Os registros de ponto (`CheckIn`) serão mantidos por 5 anos (CLT Art. 74 §4º)

---

## 4. Segurança na Eliminação

- Eliminações são registradas no `AuditLog` com ação `RETENTION_CLEANUP`
- Eliminações são **irreversíveis** — não há soft-delete para dados eliminados por esta política
- Backup do AFD (F21) segue política própria de retenção de 5 anos em storage criptografado

---

## 5. Monitoramento e Métricas

O job de retenção gera log estruturado com:

- Quantidade de registros eliminados por tipo
- Quantidade de descriptors removidos
- Tempo de execução
- Erros encontrados

Exemplo de log:
```
[Retention] 2026-07-23 02:00:00
  - descriptors_removidos: 3
  - checkins_deletados: 1247
  - tokens_deletados: 15
  - duracao: 2.3s
```

---

## 6. Revisão

Esta política deve ser revisada:

- A cada **12 meses** ou sempre que houver mudança na legislação
- Quando houver alteração significativa no tratamento de dados (nova funcionalidade biométrica, por exemplo)
- Após qualquer incidente de segurança envolvendo dados pessoais

---

## 7. Referências Legais

| Norma | Artigo | Assunto |
|---|---|---|
| LGPD | Art. 15 | Eliminação ao término do tratamento |
| LGPD | Art. 16 | Eliminação dos dados tratados com base no consentimento |
| LGPD | Art. 17 | Eliminação dos dados tratados com base no consentimento (detalhes) |
| LGPD | Art. 18, VI | Direito do titular à eliminação |
| LGPD | Art. 37 | Registro das operações de tratamento |
| CLT | Art. 74, §4º | Obrigação de manter registros por 5 anos |
| Portaria MTE 671/2021 | Art. 81 | Armazenamento do AFD em mídia segura |
