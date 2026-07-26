# Plano de Resposta a Incidentes de Segurança

**Empresa:** Viggo Tecnologia em Registro de Ponto Ltda.
**Produto:** Viggo — Registrador Eletrônico de Ponto por Programa (REP-P)
**Versão:** 1.0
**Data de Criação:** 23 de julho de 2026
**Última Revisão:** 23 de julho de 2026
**Base Legal:** LGPD Art. 48, 49 e 50 — Lei nº 13.709/2018

---

## 1. Objetivo

Este documento estabelece o processo de identificação, classificação, contenção, comunicação e remediação de incidentes de segurança da informação que envolvam dados pessoais tratados pelo Viggo, em conformidade com o Art. 48 da LGPD.

---

## 2. Escopo

Aplica-se a todos os incidentes que possam acarretar risco ou dano relevante aos titulares dos dados, incluindo但不限于:

- Acesso não autorizado a dados pessoais
- Perda, destruição ou corrupção de dados
- Vazamento de dados (incluindo dados biométricos)
- Interrupção do serviço que afete registros de ponto
- Falha de segurança em infraestrutura

---

## 3. Classificação de Incidentes

| Nível | Descrição | Exemplos | Prazo Resposta |
|-------|-----------|----------|----------------|
| **Crítico** | Vazamento de dados sensíveis ou suspensão total do serviço | Exposição de descriptors faciais, CPF; queda completa do sistema | Imediato (1h) |
| **Alto** | Acesso não autorizado ou falha parcial significativa | Tentativa de invasão detectada, corrupção parcial de dados | 4h |
| **Médio** | Falha com impacto limitado | Bug que expõe dados de um tenant específico | 24h |
| **Baixo** | Evento sem impacto direto aos titulares | Tentativa de ataque bloqueada, vulnerability scan | 72h |

---

## 4. Fluxo de Resposta

### 4.1. Identificação

```
Detectar → Registrar → Classificar → Notificar equipe
```

**Quem detecta:** Qualquer membro da equipe, sistema de monitoramento (AuditLog, Prometheus), ou denúncia de usuário.

**Registro inicial:** Criar registro no sistema de auditoria com:
- Data/hora da detecção
- Descrição do incidente
- Dados afetados (se conhecidos)
- Classificação inicial

### 4.2. Contenção

| Ação | Responsável | Prazo |
|------|-------------|-------|
| Isolar sistema afetado | Engineering Lead | Imediato |
| Revogar credenciais comprometidas | DevOps | Imediato |
| Ativar backups se necessário | DevOps | 2h |
| Preservar evidências (logs) | Security | Imediato |

### 4.3. Comunicação Interna

```
Responsável pela Detecção
        ↓
   Security Team (se existente) ou Engineering Lead
        ↓
   CEO / Diretor Responsável
        ↓
   DPO (Encarregado de Dados)
```

**Canal:** Slack (#security-incidents) + e-mail para registro formal.

### 4.4. Comunicação Externa (ANPD)

Conforme Art. 48 da LGPD, a comunicação à ANPD deve ocorrer em até **72 horas** a partir da ciência do incidente.

**Dados obrigatórios na comunicação:**
1. Descrição da natureza dos dados pessoais afetados
2. Informações sobre os titulares envolvidos
3. Indicação das medidas técnicas e de segurança utilizadas
4. Riscos relacionados ao incidente
5. Motivos da demora, se houver
6. Medidas que foram ou serão adotadas para reverter ou mitigar os efeitos

**Canal ANPD:** [https://www.gov.br/anpd/pt-br/canais_atendimento/comunicacao-de-incidentes](https://www.gov.br/anpd/pt-br/canais_atendimento/comunicacao-de-incidentes)

### 4.5. Comunicação aos Titulares

Quando o incidente puder causar risco ou dano relevante aos titulares (Art. 48, §1º):

- **Prazo:** Em até 72 horas após a comunicação à ANPD (ou antes, se possível)
- **Canal:** E-mail + notificação in-app
- **Conteúdo:** natureza do incidente, dados afetados, medidas adotadas, orientações ao titular

---

## 5. Medidas de Mitigação

### 5.1. Dados Biométricos

| Cenário | Ação |
|---------|------|
| Vazamento de descriptor | Forçar re-registro facial de todos os usuários afetados + revogar tokens |
| Acesso não autorizado a endpoint /face | Verificar logs de auditoria + revoked tokens + rate limit review |

### 5.2. Dados Cadastrais

| Cenário | Ação |
|---------|------|
| Vazamento de CPF/email | Notificar titulares + oferecer monitoramento de crédito |
| Corrupção de dados | Restaurar backup + verificar integridade |

### 5.3. Registros de Ponto

| Cenário | Ação |
|---------|------|
| Perda de dados | Restaurar backup mensal (AFD) + verificar hashes SHA-256 |
| Alteração não autorizada | Verificar integridade via hash + relatório de auditoria |

---

## 6. Pós-Incidente

Após a contenção:

1. **Análise de causa raiz:** Documentar o que causou o incidente
2. **Lições aprendidas:** Reunião com equipe (até 5 dias após contenção)
3. **Ações corretivas:** Implementar melhorias e atualizar este plano
4. **Relatório final:** Documentar cronologia, impacto, ações e resultados
5. **Atualização de segurança:** Revisar controles e testes

---

## 7. Contatos de Emergência

| Função | Nome | Contato |
|--------|------|---------|
| CEO / Diretor | [A definir] | [telefone] |
| Engineering Lead | [A definir] | [telefone] |
| DPO (Encarregado) | [A definir] | dpo@viggo.com.br |
| Advogado | [A definir] | [telefone] |

---

## 8. Revisão e Testes

- **Revisão semestral:** Este plano deve ser revisado a cada 6 meses
- **Simulação anual:** Realizar tabletop exercise pelo menos 1 vez ao ano
- **Atualização:** Sempre após um incidente real ou mudança significativa no sistema

---

*Este documento é um template e deve ser personalizado com os dados reais da empresa antes de sua utilização formal.*
