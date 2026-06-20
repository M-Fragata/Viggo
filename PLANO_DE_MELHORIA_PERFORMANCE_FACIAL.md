# Plano de Melhoria de Performance - Validação Facial Viggo

## Contexto Atual
- **Stack:** React + Vite (front) | Node.js + Express + Prisma + PostgreSQL (back)
- **Validação facial:** `face-api.js` (TensorFlow.js) rodando 100% no browser do usuário
- **Infra:** VPS Hetzner CX (CPU only) | Docker apenas PostgreSQL
- **Volume:** Baixo (< 1k check-ins/dia no lançamento)
- **Budget:** R$ 0-100/mês (apenas VPS atual)
- **Problema:** Lag/travadas durante captura e validação no mobile

---

## Estratégia: Híbrida (Front leve + Backend otimizado na mesma VPS)

### Fase 1: Quick Wins Frontend (Semana 1) - 0 custo
| Ação | Arquivo Alvo | Ganho Estimado | Status |
|------|--------------|----------------|--------|
| Trocar `ssdMobilenetv1` → `tinyFaceDetector` | `FaceAuth.tsx`, `pontoPage.tsx`, `VerifyDescriptor.tsx` | ~40% menos CPU | ✅ **Concluído** |
| Reduzir resolução captura: 640x480 → 320x240 | `FaceAuth.tsx`, `pontoPage.tsx` | 4x menos pixels | ✅ **Concluído** |
| **Lazy-load real (on-click)** | `FaceAuth.tsx` | Inicialização instantânea | ✅ **Concluído** (melhor que planejado) |
| Forçar backend WebGL: `tf.setBackend('webgl')` | `FaceAuth.tsx` | Usa GPU do device | ✅ **Concluído** |
| Throttle loop de verificação (requestAnimationFrame) | `VerifyDescriptor.tsx` | Menos lag visual | ✅ **Concluído** |
| Quantizar modelos para FP16/INT8 | Script offline + `/public/models` | ~30% mais rápido | ⏳ **Pendente** (opcional) |

### Fase 1.5: Liveness Detection Guiado (Implementado - Não Planejado)
| Feature | Arquivos | Status |
|---------|----------|--------|
| Head pose detection (yaw/pitch/roll) via landmarks 68 | `src/hooks/useHeadPose.ts` | ✅ **Concluído** |
| Blink detection (EAR - Eye Aspect Ratio) - **Simplificado: apenas frontal** | `src/hooks/useHeadPose.ts`, `src/components/LivenessChallenge.tsx` | ✅ **Concluído** |
| Componente animação guiada: Frente → Esquerda → Direita | `src/components/LivenessChallenge.tsx` | ✅ **Concluído** |
| Integração no fluxo check-in (pontoPage) | `src/pages/pontoPage.tsx` | ✅ **Concluído** |
| Validação similaridade durante desafio (distance < 0.5) | `LivenessChallenge.tsx` | ✅ **Concluído** |

### Melhoria Recente: Blink Detection Simplificado
| Mudança | Arquivo | Detalhe |
|---------|---------|---------|
| Blink apenas na etapa frontal (threshold 0.30) | `useHeadPose.ts`, `LivenessChallenge.tsx` | Mais tolerante |
| Laterais: apenas head pose (sem blink) | `LivenessChallenge.tsx` | Remove friction |
| Timeout 10s fallback no frontal | `LivenessChallenge.tsx` | Auto-avança se não piscar |
| Reset blink ao mudar etapa/cancelar | `LivenessChallenge.tsx` | Estado limpo |
| UI: ícone blink apenas no frontal | `LivenessChallenge.tsx` | Visual limpo |

### Fase 2: Backend Leve em Docker (Semana 2-3) - 0 custo extra
**Arquitetura:**
```
Frontend (browser)                    Backend (Docker na mesma VPS)
─────────────────────────────         ────────────────────────
1. tinyFaceDetector (detecta face)    4. Recebe crop 112x112 (base64/JPEG)
2. Extrai crop alinhado 112x112       5. insightface ONNX (ArcFace)
3. Envia via POST /api/face/verify    6. Gera embedding (50-150ms CPU)
                                      7. Busca no BD por companyId
                                      8. Compara cosine similarity
                                      9. Retorna { match, distance }
```

**Stack Backend:**
- **FastAPI** (Python) + **insightface** (ONNX Runtime)
- Modelo: `buffalo_l` ou `arcface_r100` quantizado
- Endpoint único: `POST /verify` + `POST /enroll`
- Redis opcional para cache de embeddings quentes

**Docker Compose (adicionar ao existente):**
```yaml
services:
  face-api:
    build: ./face-api
    ports:
      - "8001:8000"
    volumes:
      - ./face-api/models:/app/models
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
```

### Fase 3: Hardening SaaS (Semana 4) ✅ **CONCLUÍDA**
- **Multi-tenancy:** Prisma Client Extension + middleware global para injetar `companyId` automaticamente em todas as queries (`backend/src/database/prisma-extensions.ts`)
- **Rate Limiting (Duas Camadas):**
  - Edge: Cloudflare Rate Limiting Rules (IP + path `/checkins`, `/employees/face`)
  - Application: `express-rate-limit` com `keyGenerator` por `userId` + `companyId` nas rotas sensíveis (`backend/src/middleware/RateLimitMiddleware.ts`)
- **Observabilidade:** Prometheus + Grafana em containers Docker isolados (`prom/prometheus`, `grafana/grafana`, `prom/node-exporter`, `google/cadvisor`) - `backend/docker-compose.yml`
- **Logs Estruturados:** JSON logs com correlation IDs, request/response sanitizados (`backend/src/middleware/LoggingMiddleware.ts`)
- **Audit Logs:** Tabela `AuditLog` + Prisma middleware para capturar create/update/delete (`backend/src/middleware/AuditMiddleware.ts`)
- **Health Checks:** `/health` (liveness) + `/ready` (readiness) no backend (`backend/src/middleware/HealthCheckMiddleware.ts`)
- **CI/CD:** GitHub Actions → test → build → deploy to VPS via SSH (Docker Compose) (`.github/workflows/ci-cd.yml`)
- **Métricas Prometheus:** `/metrics` endpoint com contadores, histogramas e gauges (`backend/src/middleware/MetricsMiddleware.ts`)

---

## Estimativa de Performance Pós-Melhoria

| Métrica | Atual (Browser) | Pós Fase 1 | Pós Fase 1.5 (Com Liveness) | Pós Fase 2 (Híbrido) |
|---------|-----------------|------------|----------------------------|----------------------|
| Latência detecção | 100-300ms | 30-80ms | 30-80ms | 10-20ms (front) |
| Latência embedding | 200-500ms | 150-350ms | 150-350ms | 50-150ms (back) |
| **Latência total (sem liveness)** | 400-1000ms | 200-500ms | 200-500ms | **100-250ms** |
| **Latência total (com liveness)** | - | - | **3-5s** (guiado) | **3-5s** (guiado) |
| Uso CPU mobile | Alto | Médio | Médio | **Baixo** |
| Funciona offline | Sim | Sim | Sim | Não (precisa rede) |
| **Anti-spoofing (liveness)** | ❌ | ❌ | ✅ **Head pose + Blink** | ✅ **Quality + Texture** |

---

## Riscos e Mitigações

| Risco | Probabilidade | Mitigação |
|-------|---------------|-----------|
| Latência rede VPS → usuário | Média | Mesmo VPS = ~1ms; CDN Cloudflare grátis |
| insightface ONNX não compila | Baixa | Testar local primeiro; fallback dlib |
| Memória VPS insuficiente | Média | Limitar 2GB no Docker; swap configurado |
| Falsos positivos/negativos | Média | Threshold ajustável por empresa (config DB) |
| Liveness detection ausente | ~~Alta~~ **Resolvido** | ✅ Fase 1.5: head pose + blink no front |
| Thresholds liveness mobile | Média | Ajustar `YAW_THRESHOLD_FRONT=15`, `YAW_THRESHOLD_SIDE=20`, `BLINK_THRESHOLD=0.25` após testes |

---

## Próximos Passos (Aprovação Necessária)

1. **Testar mobile real** - Ajustar thresholds de yaw/pitch/blink (`YAW_THRESHOLD_FRONT=25`, `YAW_THRESHOLD_SIDE=30`)
2. **Quantização modelos** - Script FP16/INT8 para `/public/models` (opcional, ganho marginal)
3. **Decidir Fase 2:** Modelo insightface (`buffalo_l` ~60MB vs `arcface_r100` ~100MB)? Só se volume ≥ 1k/dia
4. **Validar:** Estrutura de pastas para `face-api/` (novo microserviço)?
5. **Alinhar:** Threshold de similaridade inicial (sugestão: 0.45-0.5 cosine)?

**✅ FASE 1, 1.5 e 3 CONCLUÍDAS**

---

## Arquivos a Criar/Modificar

### ✅ **Já Criados/Modificados (Fase 1 + 1.5):**
- `frontend/src/components/FaceAuth.tsx` - **Modificado** (lazy-load, tinyFaceDetector, WebGL, 320x240)
- `frontend/src/components/VerifyDescriptor.tsx` - **Modificado** (tinyFaceDetector)
- `frontend/src/pages/pontoPage.tsx` - **Modificado** (resolução, integração LivenessChallenge)
- `frontend/src/hooks/useHeadPose.ts` - **NOVO** (head pose + blink detection)
- `frontend/src/components/LivenessChallenge.tsx` - **NOVO** (animação guiada 3 passos)
- `frontend/public/models/tiny_face_detector_*` - **NOVO** (modelos baixados)
- `frontend/package.json` - **Modificado** (`@tensorflow/tfjs` adicionado)

### ⏳ **Pendentes Fase 1:**
- Script quantização modelos FP16/INT8 (opcional)

### ✅ **Concluídos Fase 1 (Recentes):**
- `frontend/src/components/VerifyDescriptor.tsx` - Throttle com requestAnimationFrame ✅
- `frontend/src/pages/RegisterFace.tsx` - Liveness no cadastro ✅

### ✅ **Concluídos Fase 3 (Hardening SaaS):**
- `backend/src/database/prisma-extensions.ts` - Multi-tenancy extension ✅
- `backend/src/middleware/RateLimitMiddleware.ts` - Rate limiting (auth, checkin, face, general) ✅
- `backend/src/middleware/LoggingMiddleware.ts` - Pino logging + correlation IDs ✅
- `backend/src/middleware/MetricsMiddleware.ts` - Prometheus metrics ✅
- `backend/src/middleware/HealthCheckMiddleware.ts` - Health/readiness checks ✅
- `backend/src/middleware/AuditMiddleware.ts` - Audit logging ✅
- `backend/docker-compose.yml` - Prometheus, Grafana, node-exporter, cadvisor ✅
- `backend/prometheus.yml` - Prometheus config ✅
- `backend/grafana/provisioning/datasources/prometheus.yml` - Grafana datasource ✅
- `backend/prisma/schema.prisma` - AuditLog model ✅
- `backend/src/database/prisma-extensions.ts` - Multi-tenancy ✅
- `backend/src/middleware/AuthMiddleware.ts` - CompanyId injection ✅
- `backend/src/routes/*.ts` - Rate limiters aplicados ✅
- `.github/workflows/ci-cd.yml` - GitHub Actions CI/CD ✅
- `backend/package.json` - Dependencies (express-rate-limit, prom-client, pino, uuid) ✅

### 📦 **Fase 2 (Futuro):**
- `face-api/Dockerfile`
- `face-api/requirements.txt`
- `face-api/main.py` (FastAPI)
- `face-api/models/` (baixar ONNX buffalo_l)
- `backend/docker-compose.yml` (atualizar)
- `frontend/src/services/faceApi.ts` (novo client)