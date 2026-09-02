# 🗓️ Planejamento de Sprints: Evolução do Viggo

Este documento detalha o planejamento das **4 Sprints de Desenvolvimento** para implementar os 7 itens selecionados do roadmap de melhorias corporativas:

* **Item 1.1:** Assinatura Eletrônica do Espelho de Ponto
* **Item 1.2:** Exportação para Sistemas de Folha (Domínio Sistemas)
* **Item 2.5:** Workflow de Ajuste de Ponto e Envio de Atestados com Foto
* **Item 3.8:** Cerca Geográfica com Raio em Metros (Geofencing)
* **Item 3.9:** Detecção de Mock Location (Anti-Fake GPS) no Mobile
* **Item 4.11:** Notificações Push de Lembrete de Ponto no Mobile
* **Item 4.12:** Modo Kiosk / Bloqueio de Terminal no Totem e Recuperação de Acesso ✅ *(Concluído)*

---

## 🏃 Sprint 1: Fechamento Digital, Compliance & Homologação Contábil
> **Objetivo:** Tornar o fechamento mensal 100% digital (sem papel) e compatível com os softwares de folha mais utilizados no Brasil.

### Entregáveis da Sprint 1:

#### 1.1 Assinatura Eletrônica do Espelho de Ponto (Portaria 671 / Lei 14.063)
* **Backend:**
  - Modelo `EspelhoPonto` no Prisma (`id`, `companyId`, `userId`, `ano`, `mes`, `pdfUrl`, `hashDocumento`, `assinadoEm`, `ipAssinatura`, `status`, `motivoRecusa`).
  - Endpoint `POST /espelhos/fechamento`: O RH gera os espelhos do mês para todos os funcionários com cálculo consolidado e hash SHA-256.
  - Endpoint `GET /espelhos/me`: O colaborador lista seus espelhos disponíveis para consulta e assinatura.
  - Endpoint `POST /espelhos/:id/assinar`: Assinatura eletrônica autenticada (senha ou biometria facial), gravando IP, data/hora UTC e gerando o carimbo de conformidade.
* **Frontend Web:**
  - **Área do Colaborador:** Modal/Página para revisar o espelho mensal e botão chamativo *"Assinar Espelho de Ponto"*.
  - **Painel do RH (`FolhaMensalPage.tsx`):** Coluna de status (*Pendente*, *Assinado*, *Recusado*) e botão *"Disponibilizar para Assinatura em Massa"*, além de download do PDF assinado.
* **Mobile (`mobile/`):**
  - Tela nativa em `app/(app)/history.tsx` ou aba dedicada de "Espelhos" permitindo ao colaborador revisar seu mês e assinar com autenticação biométrica do aparelho.

#### 1.2 Exportação Direta para Sistemas de Folha (Domínio Sistemas)
* **Backend:**
  - Serviço `dominioExportService.ts`: Gera arquivo de texto delimitado/posicional no layout padrão do **Domínio Sistemas (Thomson Reuters)**.
  - Mapeamento de eventos padrão: Horas Normais, Horas Extras 50%, Horas Extras 100%, Faltas (Horas/Dias), Atrasos e DSR.
  - Rota `GET /checkins/export/dominio?mes=MM&ano=AAAA`: Download do arquivo `.txt`.
* **Frontend Web:**
  - Seletor de formato na exportação: *"Layout Oficial AFD/AEJ"*, *"Relatório CSV/PDF"* e novo botão **"Exportar Folha (Domínio Sistemas)"**.

---

## 🏃 Sprint 2: Workflow Operacional & Gestão de Exceções
> **Objetivo:** Eliminar o retrabalho manual do RH no tratamento de pontos esquecidos e atestados médicos.

### Entregáveis da Sprint 2:

#### 2.5 Workflow de Ajuste de Ponto e Envio de Atestados com Foto/Anexo
* **Backend:**
  - Atualização do modelo `Justificativa`:
    - Campos: `tipo` (`ESQUECIMENTO_PONTO`, `ATESTADO_MEDICO`, `DECLARACAO_COMPARECIMENTO`, `VIAGEM_SERVICO`), `comprovanteUrl`, `horarioAjustado`, `diasAfastamento`, `status` (`PENDENTE`, `APROVADO`, `REJEITADO`), `motivoRejeicao`.
  - Serviço de upload seguro de imagens/PDFs de atestados médicos com criptografia em repouso e controle de acesso LGPD (dados sensíveis de saúde).
  - Rotas:
    - `POST /justificativas`: Colaborador envia a justificativa com anexo.
    - `GET /justificativas/pendentes`: RH/Gestor lista pendências da empresa.
    - `PATCH /justificativas/:id/avaliar`: RH aprova ou reprova com motivo.
* **Mobile (`mobile/`):**
  - Botão *"Solicitar Ajuste / Atestado"* no menu do colaborador.
  - Captura da foto do atestado pela câmera do celular ou upload da galeria.
  - Acompanhamento do status: *"Em análise pelo RH"*, *"Aprovado"*, *"Reprovado"*.
* **Frontend Web:**
  - **Área do Gestor (`JustificativasAdminPage.tsx`):**
    - Painel estilo kanban ou tabela com badges de prioridade.
    - Modal de visualização do atestado em alta resolução com botões *"Aprovar (Abonar Horas)"* ou *"Rejeitar"*.
    - Ao aprovar, o cálculo do espelho de ponto ajusta automaticamente a jornada do dia.

---

## 🏃 Sprint 3: Segurança de Localização & Proteção Antifraude
> **Objetivo:** Blindar a empresa contra registros de ponto fora do local de trabalho ou com GPS adulterado.

### Entregáveis da Sprint 3:

#### 3.8 Cerca Geográfica Configurável (Geofencing com Raio em Metros)
* **Backend:**
  - Tabela `WorkLocation`:
    - `id`, `companyId`, `name` (ex: Matriz, Canteiro Obra A), `latitude`, `longitude`, `radiusMeters` (ex: 100m), `policy` (`FLEXIBLE_WARN`, `STRICT_BLOCK`).
  - Verificação de proximidade no `checkinService` utilizando a fórmula de Haversine:
    - Grava no `CheckIn`: `locationId`, `distanceMeters`, `isWithinGeofence`.
* **Frontend Web:**
  - Tela em *"Configurações da Empresa"* para adicionar locais de trabalho no mapa com slider de raio em metros (ex: 50m a 1000m).
  - Visualização nos relatórios e no dashboard: tag verde `Dentro da Empresa` ou amarela `Fora da Cerca (Distância: 380m)`.

#### 3.9 Detecção de Mock Location (Anti-Fake GPS) no Mobile
* **Mobile (`mobile/app/(app)/punch.tsx`):**
  - Leitura da propriedade nativa `location.mocked` fornecida pelo hardware/sistema operacional via `expo-location`.
  - Se detectado app simulador (ex: "Fake GPS"):
    - Bloqueia imediatamente o botão de registro.
    - Exibe alerta impeditivo: *"Localização simulada detectada. Por segurança, desative aplicativos de simulação de GPS para registrar seu ponto."*
    - Registra tentativa de fraude no log de auditoria (`AuditLog`).

---

## 🏃 Sprint 4: Experiência do Colaborador & Proteção do Terminal
> **Objetivo:** Reduzir esquecimentos do dia a dia e proteger tablets corporativos instalados em recepções.

### Entregáveis da Sprint 4:

#### 4.11 Notificações Push de Lembrete de Ponto no Mobile
* **Mobile (`mobile/`):**
  - Integração com `expo-notifications` para agendamento local de alarmes/notificações.
  - Lógica inteligente com base na escala de trabalho (`WorkSchedule`):
    - **10 min antes da entrada:** *"Bom dia, [Nome]! Lembre-se de registrar sua entrada às [08:00]."*
    - **5 min antes da saída de almoço:** *"Hora do almoço! Não se esqueça de registrar seu intervalo."*
    - **5 min antes do retorno de almoço:** *"Seu intervalo está quase no fim. Registre o retorno."*
    - **10 min antes da saída:** *"Fim de expediente! Registre sua saída às [17:00]."*
  - Opção no perfil do usuário para silenciar ou personalizar a antecedência dos lembretes.

#### 4.12 Modo Kiosk / Bloqueio de Terminal no Totem e Recuperação de Acesso ✅ *(Concluído)*
* **Frontend Web (`TotemPage.tsx` / `TotemManagePage.tsx`):**
  - **Ativação Automática de Kiosk:** Ao ativar o terminal, inicia imediatamente em tela cheia (`requestFullscreen`).
  - **Wake Lock API:** Mantém a tela do monitor ou tablet permanentemente acesa na recepção/portaria sem entrar em suspensão (`navigator.wakeLock.request('screen')`).
  - **Bloqueio de Atalhos e Teclado:** Bloqueio de teclas de inspeção e recarregamento (`F12`, `F5`, `Ctrl+R`, `Ctrl+W`, `Ctrl+U`, `Ctrl+Shift+I/J`).
  - **Bloqueio de Menu de Contexto:** Previne o clique com o botão direito do mouse (`contextmenu`).
  - **Trava de Histórico e Navegação:** Previne o botão "Voltar" do navegador via `window.history.pushState` e evento `popstate`.
  - **Proteção contra Fechamento Acidental:** Listener `beforeunload` para confirmação antes de fechar a aba.
  - **Interface Moderna de Saída com 4 Abas:**
    1. **PIN do Totem:** Saída padrão rápida via PIN numérico configurado.
    2. **Biometria Facial do Admin:** Leitura facial em tempo real com máscara oval e comparação euclidiana estrita (< 0.5) contra administradores (`ENTERPRISE_ADMIN` ou `MASTER`) da empresa.
    3. **Código OTP por E-mail:** Envio de código numérico de 6 dígitos para o e-mail dos administradores cadastrados com validade de 10 minutos, máscara de privacidade (`adm***@empresa.com`), timer regressivo de 60s para reenvio e proteção anti-brute-force (máximo de 5 tentativas).
    4. **Credenciais de Administrador:** Saída clássica de emergência informando e-mail e senha do administrador.
* **Backend (`TotemController.ts` / `totemRoutes.ts` / `emailService.ts`):**
  - Rotas autenticadas com rate limiting (`totemAuthMiddleware` e `totemPinLimiter`):
    - `POST /totem/recover/face`: Validação facial contra biometrias decifradas dos administradores.
    - `POST /totem/recover/code/send`: Geração de OTP criptografado com bcrypt e envio via Resend.
    - `POST /totem/recover/code/verify`: Validação de OTP, controle de tentativas e desativação do totem (`totemActive: false`).
  - Template corporativo responsivo de e-mail [`totemRecoveryCode.ts`](file:///c:/Users/matheusmoraes/Documents/GitHub/Viggo/backend/src/templates/totemRecoveryCode.ts).
  - Testes unitários com Vitest cobrindo 100% dos cenários de sucesso, erro e rate limiting em [`TotemController.test.ts`](file:///c:/Users/matheusmoraes/Documents/GitHub/Viggo/backend/src/test/unit/controller/TotemController.test.ts) e [`templates.test.ts`](file:///c:/Users/matheusmoraes/Documents/GitHub/Viggo/backend/src/test/unit/templates/templates.test.ts).
* **Mobile (`mobile/app/(app)/totem.tsx` / `mobile/services/api.ts`):**
  - Interceptação do botão físico/gestual de "Voltar" do Android via `BackHandler` (`hardwareBackPress`), impedindo a saída indevida do terminal.
  - Card integrado de recuperação via código OTP por e-mail no app móvel.

---

## 🗓️ Linha do Tempo e Sequenciamento de Execução

```
Sprints e Entregas:
┌────────────────────────────────────────────────────────┐
│ SPRINT 1: COMPLIANCE & FECHAMENTO DIGITAL              │
│  ✓ 1.1 Assinatura Eletrônica do Espelho de Ponto       │
│  ✓ 1.2 Exportador para Folha (Domínio Sistemas)        │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│ SPRINT 2: OPERAÇÃO & GESTÃO DE EXCEÇÕES                │
│  ✓ 2.5 Workflow de Ajustes e Atestados com Foto        │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│ SPRINT 3: SEGURANÇA & CONTROLE DE LOCAL                │
│  ✓ 3.8 Cerca Geográfica com Raio (Geofencing)          │
│  ✓ 3.9 Detecção de Mock Location (Anti-Fake GPS)       │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│ SPRINT 4: EXPERIÊNCIA & PROTEÇÃO DO TOTEM              │
│  ✓ 4.11 Lembretes Push de Ponto no Celular             │
│  ✓ 4.12 Modo Kiosk no Totem Corporativo                │
└────────────────────────────────────────────────────────┘
```
