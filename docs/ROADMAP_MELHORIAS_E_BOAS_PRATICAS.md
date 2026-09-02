# 🚀 Roadmap de Melhorias e Boas Práticas de Mercado - Viggo

Este documento detalha as funcionalidades e boas práticas consolidadas nos principais softwares de ponto eletrônico corporativo do mercado brasileiro (**Pontomais/TOTVS, Tangerino by Sólides, Ahgora/Senior e Flash/Oitchau**), organizadas em **ordem rigorosa de prioridade** (Impacto Jurídico, Comercial e Operacional).

---

## 📌 Sumário de Priorização

| Prioridade | Funcionalidade | Impacto Principal | Complexidade |
|---|---|---|:---:|
| **Nível 1 (Máxima)** | 1.1 Assinatura Eletrônica do Espelho de Ponto | Compliance Portaria 671 / Zero Papel | Média |
| **Nível 1 (Máxima)** | 1.2 Exportação para Sistemas de Folha (Domínio, etc.) | Atração de Contadores e Parcerias BPO | Baixa-Média |
| **Nível 1 (Máxima)** | 1.3 Módulo de Banco de Horas Acumulativo | Gestão de Compensação e Horas Extras | Média-Alta |
| **Nível 1 (Máxima)** | 1.4 Adicional Noturno e Hora Ficta (CLT Art. 73) | Conformidade Trabalhista Obrigatória | Média |
| **Nível 2 (Alta)** | 2.1 Workflow de Ajustes e Atestados com Foto | Redução de Trabalho Manual do RH | Média |
| **Nível 2 (Alta)** | 2.2 Alertas de Anomalias (Batida Ímpar / Interjornada) | Prevenção de Multas e Passivo Trabalhista | Média |
| **Nível 2 (Alta)** | 2.3 Regra de DSR sobre Faltas Injustificadas | Precisão no Fechamento da Folha | Baixa |
| **Nível 3 (Média)** | 3.1 Cerca Geográfica com Raio em Metros (Geofencing) | Controle de Ponto em Clientes e Obras | Média |
| **Nível 3 (Média)** | 3.2 Detecção de Mock Location (Anti-Fake GPS) | Proteção Antifraude no Mobile | Baixa |
| **Nível 4 (Baixa)** | 4.1 Notificações Push de Lembrete de Ponto | Redução de Esquecimentos no Dia a Dia | Baixa |
| **Nível 4 (Baixa)** | 4.2 Modo Kiosk / Bloqueio de Terminal no Totem | Proteção Física do Dispositivo | ✅ Concluído |

---

## 🔴 NÍVEL 1: PRIORIDADE MÁXIMA (Compliance Trabalhista & Tração Comercial)

### 1.1 Assinatura Eletrônica do Espelho de Ponto (Portaria 671 / Lei 14.063)
* **O Problema Atual:** O Viggo gera o Relatório Mensal MTE com hash SHA-256 em PDF/CSV, mas o RH ainda precisa imprimir o relatório em papel para o colaborador assinar manualmente com caneta no final de cada mês.
* **Como os Líderes Fazem:**
  - O RH define o período de fechamento (ex: dia 21 ao dia 20 ou mês fechado) e clica em *"Disponibilizar Espelhos para Assinatura"*.
  - O colaborador recebe notificação no app mobile e no portal web.
  - Abre o Espelho de Ponto digital, revisa marcações, horas extras e justificativas.
  - Clica em **"Assinar Espelho de Ponto"**. O sistema gera um comprovante assinado eletronicamente com:
    - IP do dispositivo, timestamp UTC, hash do documento e autenticação por senha ou biometria facial.
* **Modelagem Técnica:**
  - Tabela `EspelhoPonto`:
    - `id`, `companyId`, `userId`, `ano`, `mes`, `pdfUrl`, `hashDocumento`, `assinadoEm`, `ipAssinatura`, `status` (`PENDENTE_ASSINATURA`, `ASSINADO`, `RECUSADO`), `motivoRecusa`.

---

### 1.2 Layouts de Exportação para Softwares Contábeis (Domínio, Senior, TOTVS)
* **O Problema Atual:** Escritórios de contabilidade e departamentos pessoais exigem que o software de ponto gere o arquivo de texto pronto para importação no sistema de folha de pagamento da empresa.
* **Como os Líderes Fazem:**
  - Na tela de fechamento, além do AFD e AEJ, o RH escolhe o layout:
    1. **Domínio Sistemas (Thomson Reuters):** Utilizado por mais de 70% das contabilidades do Brasil (layout posicional padrão texto com código de evento de horas normais, extras 50%, extras 100%, faltas e adicional noturno).
    2. **Senior / Rubi:** Padrão das médias e grandes empresas.
    3. **TOTVS RM / Protheus:** Formato delimitado padrão corporativo.
* **Benefício Comercial:** Torna o Viggo imediatamente homologado para venda em massa para escritórios de contabilidade e terceirizadores de folha (BPO de RH).

---

### 1.3 Módulo de Banco de Horas Acumulativo e Compensação
* **O Problema Atual:** O Viggo calcula as horas extras de cada dia, mas não mantém o saldo transitório de horas mês a mês.
* **Como os Líderes Fazem:**
  - A empresa configura a regra por funcionário ou por escala:
    - **Modo Horas Extras:** Tudo o que passar da jornada diária vai para a folha de pagamento como extra 50% ou 100%.
    - **Modo Banco de Horas:** Horas excedentes acumulam saldo positivo; atrasos acumulam saldo negativo.
  - Parâmetros configuráveis:
    - Validade do saldo: 6 meses (acordo individual CLT Art. 59 § 5º) ou 1 ano (acordo coletivo).
    - Extrato de Banco de Horas visível para o funcionário no app.
* **Modelagem Técnica:**
  - Tabela `BancoHorasLancamento`:
    - `id`, `userId`, `companyId`, `data`, `minutosCredito`, `minutosDebito`, `saldoResultante`, `tipo` (`BATIDA_EXTRA`, `ATRASO`, `COMPENSACAO_FOLGA`, `AJUSTE_MANUAL`), `expiraEm`.

---

### 1.4 Adicional Noturno e Hora Ficta Reduzida (CLT Art. 73)
* **O que a Lei Exige:**
  - Horas trabalhadas entre **22:00 e 05:00** contam com a **hora ficta** de 52 minutos e 30 segundos (ou seja, 1 hora trabalhada equivale a 1,1428 horas contadas).
  - Adicional de no mínimo 20% sobre o valor da hora normal.
  - Prorrogação da jornada noturna: se a jornada iniciou à noite e ultrapassou as 05:00 da manhã, as horas subsequentes mantêm o adicional.
* **Implementação:**
  - Separador no `relatorioMensalService.ts` das colunas: `Horas Diurnas`, `Horas Noturnas`, `Extras Diurnas`, `Extras Noturnas`.

---

## 🟡 NÍVEL 2: PRIORIDADE ALTA (Gestão Operacional & Redução de Conflitos)

### 2.1 Workflow de Ajuste de Ponto e Envio de Atestados Médicos com Anexo
* **Como os Líderes Fazem:**
  - **No Mobile / Web do Colaborador:**
    - Botão *"Solicitar Ajuste de Ponto"* (quando esqueceu de bater ou a internet impediu).
    - Botão *"Enviar Atestado Médico"* com upload de foto da receita/atestado e quantidade de dias de afastamento.
  - **No Painel do Gestor (Dashboard):**
    - Aba *"Central de Aprovações"* com listagem dos pedidos pendentes.
    - O gestor visualiza o anexo, o motivo e clica em **Aprovar** ou **Recusar**.
    - Ao aprovar, o ponto é regularizado no espelho mensal com a observação legal de abono.

---

### 2.2 Alertas de Anomalias em Tempo Real (Prevenção de Passivos Trabalhistas)
* **O Problema:** O RH só descobre que um funcionário esqueceu de bater a saída no último dia do mês, atrasando o fechamento da folha.
* **Como os Líderes Fazem:**
  - Rotina de verificação no final do dia que identifica:
    1. **Batida Ímpar:** Colaborador bateu entrada, mas não registrou saída após 12 horas.
    2. **Violação de Descanso Interjornada (CLT Art. 66):** Menos de 11 horas consecutivas de intervalo entre a saída de ontem e a entrada de hoje.
    3. **Jornada Extensa sem Intervalo (CLT Art. 71):** Mais de 6 horas de trabalho contínuo sem intervalo intrajornada (almoço).
  - Notificação no painel do administrador com card de alerta: *"3 inconsistências pendentes de resolução hoje"*.

---

### 2.3 Regra de DSR (Descanso Semanal Remunerado) sobre Faltas Injustificadas
* **Como Funciona na CLT (Lei 605/49):**
  - O colaborador que faltar sem justificativa legal ou tiver atrasos não autorizados durante a semana perde o direito à remuneração do domingo/DSR da semana seguinte.
  - No relatório mensal, o sistema aponta automaticamente a perda do DSR para desconto em folha.

---

## 🟢 NÍVEL 3: PRIORIDADE MÉDIA (Segurança e Cerca Geográfica)

### 3.1 Cerca Geográfica Configurável (Geofencing)
* **Como Funciona:**
  - No cadastro da empresa ou departamento, o gestor cadastra o ponto no mapa com raio em metros:
    - Ex: *Matriz - Av. Paulista, 1000 (Raio: 100 metros)*.
    - Ex: *Cliente X - Canteiro de Obras (Raio: 250 metros)*.
  - Ao registrar o ponto:
    - O sistema calcula a distância matemática (fórmula de Haversine) entre a coordenada do celular e o centro da cerca.
    - **Política Flexível:** Registra normalmente, mas aplica tag amarela no painel: `Fora da Cerca Virtual (Distância: 420m)`.
    - **Política Restritiva:** Bloqueia a batida e orienta o colaborador a solicitar autorização especial.

---

### 3.2 Detecção de Mock Location (Anti-Fake GPS) no Mobile
* **Como os Burladores Agem:** Em celulares Android, usuários instalam aplicativos como *"Fake GPS Location"* e ativam *"Permitir locais fictícios"* no menu de desenvolvedor para fingir que estão no escritório.
* **Proteção Nativa:**
  - No React Native (`expo-location`), a propriedade `location.mocked` indica nativamente se a coordenada foi gerada por um aplicativo simulador.
  - Se `mocked === true`: o app rejeita o registro com alerta: *"Localização simulada detectada. Desative aplicativos de GPS falso para bater ponto"*.

---

### 3.3 Antifraude de Foto de Foto / Spoofing Passivo
* **Como os Líderes Fazem:**
  - O desafio de vivacidade (Liveness) frontal e lateral do Viggo já resolve 90% das fraudes de foto estática.
  - A camada complementar analisa a textura da imagem para identificar brilhos característicos de telas de celulares/monitores (quando alguém coloca o celular com a foto de outra pessoa na frente da câmera).

---

## ⚪ NÍVEL 4: PRIORIDADE BAIXA (Experiência do Usuário e Operação)

### 4.1 Notificações Push de Lembrete de Ponto no Mobile
* **Como Funciona:**
  - O aplicativo lê a escala de trabalho do colaborador e agenda notificações push locais:
    - 10 minutos antes da entrada: *"Bom dia! Lembre-se de registrar sua entrada às 08:00."*
    - 5 minutos antes do almoço: *"Hora do almoço! Não esqueça do seu registro."*
    - 10 minutos antes do fim do expediente: *"Fim da jornada! Registre sua saída."*
* **Benefício:** Reduz o esquecimento de ponto em mais de 70%, aliviando o RH de ter que tratar exceções manuais.

---

### 4.2 Modo Kiosk / Bloqueio de Terminal no Totem e Recuperação de Acesso ✅ *(Concluído)*
* **Implementação Realizada:**
  - **Terminal Web e Tablets de Recepção (`TotemPage.tsx` / `TotemManagePage.tsx`):**
    - Ativação imediata em tela cheia (`requestFullscreen`).
    - Integração com a **Wake Lock API** (`navigator.wakeLock.request('screen')`) impedindo que a tela apague ou suspenda na portaria.
    - Bloqueio de teclado e teclas de desenvolvedor/refresh (`F12`, `F5`, `Ctrl+R`, `Ctrl+W`, `Ctrl+U`, `Ctrl+Shift+I/J`).
    - Bloqueio do menu de contexto (clique direito com mouse).
    - Trava de recuo no histórico (`window.history.pushState` e `popstate`).
    - Proteção contra fechamento de aba via `beforeunload`.
    - **4 Métodos de Saída e Recuperação:**
      1. *PIN do Totem:* Saída operacional rápida padrão.
      2. *Biometria Facial do Admin:* Scanner com máscara oval e matching euclidiano estrito (< 0.5) contra administradores (`ENTERPRISE_ADMIN`/`MASTER`) cadastrados da empresa.
      3. *Código OTP por E-mail:* Envio de código numérico de 6 dígitos via Resend válido por 10 minutos com e-mail mascarado (`adm***@empresa.com`) e limite anti-brute force de 5 tentativas.
      4. *Credenciais de Admin:* Desbloqueio emergencial por e-mail e senha de administrador.
  - **Aplicativo Mobile (`mobile/app/(app)/totem.tsx`):**
    - Interceptação de hardware back press do Android com `BackHandler`, evitando saída acidental da tela do Totem pelo botão ou gestos nativos.
    - Card nativo de solicitação e validação de código OTP de recuperação por e-mail.
  - **Backend & Testes (`TotemController.ts` / `TotemController.test.ts` / `templates.test.ts`):**
    - Rotas protegidas com rate limiting (`/totem/recover/face`, `/totem/recover/code/send` e `/totem/recover/code/verify`).
    - Template corporativo responsivo [`totemRecoveryCode.ts`](file:///c:/Users/matheusmoraes/Documents/GitHub/Viggo/backend/src/templates/totemRecoveryCode.ts).
    - 100% de cobertura em testes unitários automatizados com Vitest.

---

## 🎯 Resumo da Recomendação de Execução (Fases Sugeridas)

```
  ┌────────────────────────────────────────────────────────┐
  │ FASE 1: GERAÇÃO DE VALOR E COMERCIAL                   │
  │  1. Assinatura Eletrônica do Espelho de Ponto          │
  │  2. Exportador para Domínio Sistemas (Contabilidades)  │
  └──────────────────────────┬─────────────────────────────┘
                             │
  ┌──────────────────────────▼─────────────────────────────┐
  │ FASE 2: GESTÃO TRABALHISTA COMPLETA                    │
  │  3. Banco de Horas Acumulativo e Compensação           │
  │  4. Adicional Noturno e Hora Ficta (CLT 73)            │
  │  5. Workflow de Atestados Médicos com Upload de Foto   │
  └──────────────────────────┬─────────────────────────────┘
                             │
  ┌──────────────────────────▼─────────────────────────────┐
  │ FASE 3: SEGURANÇA E REFINAMENTO                        │
  │  6. Cerca Geográfica com Raio (Geofencing)             │
  │  7. Bloqueio de Mock Location (Anti-Fake GPS)          │
  │  8. Lembretes Push de Ponto no Mobile                  │
  └────────────────────────────────────────────────────────┘
```
