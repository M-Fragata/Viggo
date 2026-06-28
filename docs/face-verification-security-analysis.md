# Viggo - Verificação Facial: Análise de Segurança e Alternativas

> **Status:** Discussão técnica pendente - Arquitivo criado em 28/06/2026

---

## 1. Situação Atual (Como Está Hoje)

Toda a verificação facial do funcionário ao bater ponto ocorre **exclusivamente no frontend** (`pontoPage.tsx`).

### Fluxo Atual (Detalhado):

1. `handleCheckin(tipo)` - Usuário clica em "Registrar Ponto" (Entrada, Almoço, Saída, etc.)
2. `handleGetEmployee()` - Frontend busca `faceDescriptor` (Float32Array) do backend (`/employees/face`), mas **não faz nenhuma validação ainda**
3. `LivenessChallenge` - Componente React executa no cliente:
   - Carrega modelos face-api.js no navegador
   - Faz detecção de rosto via webcam (`videoRef`)
   - Valida 3 poses: **front** (frente + blink), **left** (esquerda), **right** (direita)
   - Quando as 3 poses são validadas, retorna o `bestFrameDescriptor`
4. `verificarPonto()` em `VerifyDescriptor.tsx` - **Comparação facial no frontend**
   - Pega o `descriptorSalvo` buscado no passo 2
   - Usa `faceapi.euclideanDistance(descriptorAtual, descriptorSalvo)`
   - Se `distance < 0.5`, retorna sucesso
   - **Toda a lógica de autenticação biométrica acontece no frontend**
5. `api.checkins.create()` - Backend só grava o ponto no banco (CREATE em `CheckinController`)

### Problemas Críticos:
- **Nenhuma verificação server-side**: O `CheckinController#createCheckin` só recebe `type`, `latitude`, `longitude` — não recebe dados faciais
- **Bypass trivial**: Um script/Postman/bot malicioso pode chamar `POST /checkins` diretamente sem qualquer verificação facial. Não há nada impedindo re-envio de requisições com o mesmo payload.
- **Descriptor exposto no front**: O descriptor é essencialmente a "senha" biométrica aberta. Parseável, reutilizável, sem proteção.
- **Replay attack**: Uma vez que o descriptor é obtido (ou forjado), pode ser reutilizado para bater ponto sem o usuário autorizado.

### Código Relevante:
```
frontend/src/pages/pontoPage.tsx          → Coordena o fluxo
frontend/src/components/LivenessChallenge.tsx   → Detecta poses via face-api.js (front)
frontend/src/components/VerifyDescriptor.tsx      → Compara euclideanDistance (front)
frontend/src/hooks/useHeadPose.ts                  → Lógica de head pose estimation (front)
backend/src/controller/CheckinController.ts       → Só grava no banco (sem validação facial)
backend/src/controller/EmployeesController.ts       → Retorna faceDescriptor (GET /employees/face)
```

---

## 2. Alternativas de Arquitetura (Discutidas)

### 2.1. Opção A - Verificação 100% Backend (Streaming de Vídeo)

O frontend faz streaming de vídeo (ou frames) para um endpoint backend, que processa a face detection e liveness na nuvem.

- **Prós**: Controle total server-side. Impossível burlar sem biometria real. Auditoria completa no servidor.
- **Contras**: Extremamente complexo. Latência alta. Custo de infraestrutura (servidor processando streams de vídeo em tempo real). Overkill para o escopo atual.
- **Nota**: Esta opção foi rejeitada por completo porоваća excessivamente complexa e custosa.

### 2.2. Opção B - Envio de Descriptor + Verificação Backend (Recomendada pelo usuário)

O frontend mantém o LivenessChallenge (detecção local de poses), mas envia o `Float32Array` (face descriptor) do frame capturado para o backend. O backend compare com o `faceDescriptor` salvo no banco.

#### Fluxo Proposto:
1. Front: LivenessChallenge detecta poses (front, left, right)
2. A cada pose validada, captura o `faceDescriptor` do frame
3. Envia para `POST /api/face/verify` (ou similar)
4. Backend busca `user.faceDescriptor` do banco, calcula `euclideanDistance`, retorna `{ success: true/false, distance }`
5. Se sucesso, front chama `api.checkins.create()`

#### Prós:
- Backend controla a autenticação (não pode ser burlado com chamada direta a `/checkins`)
- Implementação relativamente simples (reaproveita lógica existente no `VerifyDescriptor.tsx`)
- Baixa latência (envio de ~128 floats via API)

#### Contras:
- **Replay attack ainda possível**: O `Float32Array` pode ser capturado e replayado. Um token fixo pode ser interceptado e reutilizado.
- **Precisão de floating-point**: JSON pode truncar floats, afetando `euclideanDistance`.
- **3 chamadas de API**: Uma por cada pose (front, left, right), o que introduz latência percebida alta para o usuário.

### 2.3. Opção B+ - Validação em Batch (Sugestão da IA)

Ao invés de enviar um descriptor a cada pose, o front armazena os 3 frames e envia **todos de uma vez** quando o LivenessChallenge completa.

#### Fluxo:
1. Front: LivenessChallenge detecta as 3 poses, **armazena os 3 descriptors localmente**
2. Quando completa, envia payload único para `POST /api/face/verify-batch`
3. Body: `{ challengeId: "abc-123", descriptors: [d1, d2, d3] }`
4. Backend: Recebe os 3, compara cada um com o `faceDescriptor` salvo, retorna `success` se média/melhor frame passar
5. Front recebe OK e chama `api.checkins.create()`

#### Prós:
- Uma chamada de trecho para validação facial
- Retém controle server-side
- Latência menor que 3 chamadas separadas

#### Contras:
- `challengeId` precisa ser gerado e gerenciado (sessão temporária no backend)
- Replay attack ainda possível (se o payload for interceptado)
- Desafio anterior: como garantir que o usuário realmente fez as 3 poses e não apenas replayou o vídeo? O liveness no front é um controle fraco (pode ser simulado com vídeo gravado)

---

## 3. Considerações Técnicas Importantes

### 3.1. Modelos Utilizados (face-api.js)

| Modelo | Servidor Atual | Cliente (Navegador) |
|--------|----------------|---------------------|
| `face-api.js` | Não instalado | Instalado (`frontend/package.json`) |
| `tinyFaceDetector` | Não | Sim |
| `faceLandmark68Net` | Não | Sim |
| `faceRecognitionNet` | Não | Sim |

**Implicação**: A Opção B+ requer instalar `face-api.js` no backend ou criar uma rota que recebe descriptors e compara matematicamente (sem precisar processar imagem).

### 3.2. Dados Sensíveis

- **Face Descriptor**: Array de 128 floats (aprox. 512 bytes) — representação irreversível da face.
- **Vídeo/Frame**: Dados PII (Personal Identifiable Information) — requer cuidado no armazenamento/transmissão.
- **Geolocalização**: Latitude/longitude do funcionário (já enviado, mas relevante para privacidade).

### 3.3. Rate Limiting

- Atualmente temos `faceValidationLimiter` em `GET /employees/face` e `checkinLimiter` em `POST /checkins`.
- Uma rota `POST /api/face/verify` precisaria de seu próprio limiter (mais restritivo que o de checkin).

---

## 4. Próximos Passos (Pendente Decisão)

| Item | Status | Notas |
|------|--------|-------|
| Decidir arquitetura | **PENDENTE** | Opção B é a preferência do usuário para análise posterior |
| Definir formato de payload (descriptors vs. base64) | **PENDENTE** | Descriptors são mais leves; base64 impede replay mas é mais pesado |
| Decidir entre validação tempo-real vs. batch (3 poses) | **PENDENTE** | Tempo-real = 3 chamadas à API (lento); Batch = 1 chamada, mais complexo |
| Implementar rate limiter para `/face/verify` | **PENDENTE** | Criticamente importante para evitar brute-force |
| Instalar `face-api.js` no backend (ou fórmula pura) | **PENDENTE** | Apenas necessário se for comparar no backend |
| C considerations (audit log, re-check) | **PENDENTE** | Registrar tentativas falhas; possível re-check com administrador |

---

## 5. Decisões que Precisam Ser Tomadas

1. **Precisamos de autenticação server-side ou a verificação 100% front com o liveness é suficiente para MVP?**
2. **Se sim, qual abordagem (B, B+, ou outra)?**
3. **Como lidar com replay attacks?** (Token assinado por pose? Challenge/Response parcial?)
4. **Qual o nível de latência aceitável?** (Batch resolve latência, mas introduz sessão gerenciada no backend)
5. **Yay! O usuário possui outro pensamento para implementar (ver data de criação do arquivo)**

---

*Este arquivo serve como ponto de partida para discussão. Não deve ser ação transformado em código sem revisão e decisão explícita.*