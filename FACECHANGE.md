# FACECHANGE.md - Plano de Implementação: Validação Facial no Backend + Tempo de Pose

## Visão Geral

Dois ajustes no `frontend/src/components/LivenessChallenge.tsx`:

1. **Validação facial no backend a cada comparação** — cada validação de pose envia o descriptor para o backend comparar, em vez de comparar apenas localmente no frontend
2. **Tempo mínimo de 2 segundos na posição correta** — usuário deve manter a pose por 2s antes de validar, usando o círculo de progresso como feedback visual

---

## Situação Atual

### Comparação Facial

- O `LivenessChallenge.tsx` faz comparação **local** usando `faceapi.euclideanDistance` (linhas 455-462)
- Só envia para o backend no final via `api.checkins.create()`
- Se um rosto diferente do cadastrado for detectado, ele aceita até a 3ª validação para recusar

### Tempo de Pose

- Não há restrição de tempo — basta a pose estar correta num frame para contar validação
- Usuário pode balançar a cabeça rapidamente e validar sem manter a posição

---

## Fluxo Atual

| Fase | Animação do Círculo | Ação |
|------|---------------------|------|
| Pose incorreta | Vazio/vermelho | Aguardando |
| Pose correta | Preenchimento instantâneo | Conta validação imediatamente |
| Validações completas | Spin verde + transição | Próxima etapa |

---

## Fluxo Novo

| Fase | Animação do Círculo | Ação |
|------|---------------------|------|
| Pose incorreta | Vazio/vermelho | `ringMotionVal = 0`, `poseHoldStart = 0` |
| Pose correta (0-2s) | **Preenchendo progressivamente** (verde) | `ringMotionVal = progress%` baseado no tempo decorrido |
| 2s completados | **Spin verde** (animação existente) | Enviar descriptor para backend validar |
| Backend OK | Spin completa → próxima etapa | Incrementar validação |
| Backend falha + fallback local OK | Spin completa → próxima etapa | Incrementar validação (fallback) |
| Backend falha + fallback local falha | Reset para vazio/vermelho | `poseHoldStart = 0`, mostrar mensagem de erro |

---

## Implementação

### 1. Backend — Nova Rota de Verificação Facial

#### Arquivo: `backend/src/routes/employeesRoutes.ts`

Adicionar rota com rate limit por usuário:

```typescript
employeesRoutes.post(
  "/face/verify",
  authMiddleware,
  faceValidationLimiter,
  employeesController.verifyFace
)
```

> Rate limit existente: `faceValidationLimiter` — 30 requisições/hora por `req.user.id`

#### Arquivo: `backend/src/controller/EmployeesController.ts`

Novo método `verifyFace`:

```typescript
async verifyFace(req: Request, res: Response) {
  const bodySchema = z.object({
    descriptor: z.array(z.number()).min(128).max(128)
  })

  const userId = req.user.id
  const { descriptor } = bodySchema.parse(req.body)

  const user = await prisma.user.findUnique({ where: { id: userId } })

  if (!user) return res.status(404).json({ message: "Usuário não encontrado" })

  if (!user.faceDescriptor) {
    return res.status(403).json({
      code: "FACE_NOT_REGISTERED",
      message: "Registro facial pendente. Por favor, cadastre sua face antes de bater o ponto."
    })
  }

  const savedDescriptor = new Float32Array(Object.values(user.faceDescriptor))
  const inputDescriptor = new Float32Array(descriptor)

  const distance = faceapi.euclideanDistance(inputDescriptor, savedDescriptor)
  const threshold = 0.5

  if (distance < threshold) {
    return res.json({ success: true, distance })
  }

  return res.status(401).json({
    success: false,
    distance,
    message: "Rosto não reconhecido"
  })
}
```

#### Dependência: `face-api.js` no backend

Verificar se `face-api.js` está em `backend/package.json`. Se não, instalar:

```bash
cd backend && npm i face-api.js
```

> Nota: A função `euclideanDistance` do face-api.js é puramente matemática (não precisa de TensorFlow/browser). Ela apenas calcula a distância entre dois vetores Float32Array. Como alternativa, pode-se implementar manualmente:

```typescript
function euclideanDistance(a: Float32Array, b: Float32Array): number {
  let sum = 0
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i]
    sum += diff * diff
  }
  return Math.sqrt(sum)
}
```

> **Decisão:** Se `face-api.js` for pesado para o backend, implementar `euclideanDistance` manualmente (3 linhas) e evitar a dependência inteira.

---

### 2. Frontend — Nova API

#### Arquivo: `frontend/src/services/api.ts`

Adicionar em `api.employees`:

```typescript
employees: {
  getFaceDescriptor: () => fetchApi<FaceDescriptorResponse>("/employees/face"),
  updateFaceDescriptor: (userId: string, descriptor: number[]) =>
    fetchApi<User>(`/sessions/${userId}`, {
      method: "PUT",
      body: JSON.stringify({ faceDescriptor: descriptor }),
    }),
  verifyFace: (descriptor: number[]) =>
    fetchApi<{ success: boolean; distance: number; message?: string }>("/employees/face/verify", {
      method: "POST",
      body: JSON.stringify({ descriptor }),
    }),
},
```

---

### 3. Frontend — Modificações no `LivenessChallenge.tsx`

#### Novas constantes e refs

```typescript
const POSE_HOLD_DURATION_MS = 2000

// Dentro do componente:
const poseHoldStartRef = useRef<number>(0)
const isValidatingRef = useRef(false)
```

#### Reset do `poseHoldStart` quando troca de step

Adicionar no effect de `currentStepIndex`:

```typescript
poseHoldStartRef.current = 0
isValidatingRef.current = false
```

#### Refatoração do `checkPose` — Nova lógica

Substituir o bloco `if (stepPassed)` existente (linhas 451-473) pela nova lógica:

```typescript
if (stepPassed) {
  // Iniciar contagem de tempo se ainda não começou
  if (poseHoldStartRef.current === 0) {
    poseHoldStartRef.current = Date.now()
  }

  const heldTime = Date.now() - poseHoldStartRef.current
  const holdProgress = Math.min(100, (heldTime / POSE_HOLD_DURATION_MS) * 100)

  // Feedback visual: preencher círculo proporcionalmente ao tempo mantido
  ringMotionVal.set(holdProgress)

  // Só validar após manter pose por POSE_HOLD_DURATION_MS
  if (heldTime >= POSE_HOLD_DURATION_MS && !isValidatingRef.current) {
    isValidatingRef.current = true
    setWasCorrectPose(true)

    try {
      // Enviar para backend validar
      const descriptor = Array.from(detection.descriptor)
      const result = await api.employees.verifyFace(descriptor)

      if (result.success) {
        // Sucesso no backend: incrementar validação
        setBestFrameDescriptor(detection.descriptor)
        poseHoldStartRef.current = 0
        validationsCountRef.current += 1

        const count = validationsCountRef.current
        const needed = config.validationsNeeded

        if (count >= needed) {
          playTransitionAnimation(advanceToNextStep)
        } else if (count === 1 && needed > 1) {
          startFillAnimation(0, config.progressTarget, config.fillDuration)
        }
      } else {
        // Falha no backend: tentar fallback local
        if (faceDescriptor) {
          const distance = faceapi.euclideanDistance(detection.descriptor, faceDescriptor)
          if (distance < 0.5) {
            setBestFrameDescriptor(detection.descriptor)
            poseHoldStartRef.current = 0
            validationsCountRef.current += 1

            const count = validationsCountRef.current
            const needed = config.validationsNeeded

            if (count >= needed) {
              playTransitionAnimation(advanceToNextStep)
            } else if (count === 1 && needed > 1) {
              startFillAnimation(0, config.progressTarget, config.fillDuration)
            }
          } else {
            poseHoldStartRef.current = 0
            ringMotionVal.set(0)
            setMessage(`Rosto não reconhecido (dist: ${distance.toFixed(2)})`)
          }
        } else {
          poseHoldStartRef.current = 0
          ringMotionVal.set(0)
          setMessage(`Rosto não reconhecido (dist: ${result.distance.toFixed(2)})`)
        }
      }
    } catch (err) {
      // Erro de rede: fallback local
      console.error('Erro na verificação backend:', err)

      if (faceDescriptor) {
        const distance = faceapi.euclideanDistance(detection.descriptor, faceDescriptor)
        if (distance < 0.5) {
          setBestFrameDescriptor(detection.descriptor)
          poseHoldStartRef.current = 0
          validationsCountRef.current += 1

          const count = validationsCountRef.current
          const needed = config.validationsNeeded

          if (count >= needed) {
            playTransitionAnimation(advanceToNextStep)
          } else if (count === 1 && needed > 1) {
            startFillAnimation(0, config.progressTarget, config.fillDuration)
          }
        } else {
          poseHoldStartRef.current = 0
          ringMotionVal.set(0)
          setMessage("Erro de conexão. Tente novamente.")
        }
      } else {
        poseHoldStartRef.current = 0
        ringMotionVal.set(0)
        setMessage("Erro de conexão. Tente novamente.")
      }
    } finally {
      isValidatingRef.current = false
    }
  }
} else {
  // Pose incorreta: resetar timer e progresso visual
  poseHoldStartRef.current = 0
  setWasCorrectPose(false)

  ringMotionVal.set(0)

  // Mensagens de feedback (mantém lógica existente)
  const yawDeg = Math.round(-headPose.yaw)
  if (step === 'front') {
    setMessage(`Centralize o rosto (Yaw: ${yawDeg}°)`)
  } else if (step === 'left') {
    setMessage(`Vire mais para a esquerda (Yaw: ${yawDeg}°)`)
  } else if (step === 'right') {
    setMessage(`Vire mais para a direita (Yaw: ${yawDeg}°)`)
  }
}
```

#### Remover código obsoleto

- **Remover**: Comparação local que acontecia nas linhas 455-462 (já substituída pela lógica acima)
- **Remover**: Incremento de `validationsCountRef` que estava fora do bloco de 2s (linha 452)
- **Ajustar**: `startFillAnimation` pode não ser mais necessário com a mesma lógica, pois o preenchimento agora é pelo tempo de pose. Avaliar caso a caso por step.

---

## Threshold de Comparação

- **Valor**: `0.5` (mesmo usado atualmente no frontend)
- **Justificativa**: Valor padrão consolidado para face-api.js com modelo `faceRecognitionNet`. Abaixo de 0.5 = mesma pessoa. Acima = pessoa diferente.

---

## Fallback Local

Se o backend falhar (timeout, 500, erro de rede), o frontend faz comparação local como fallback:

```
Backend OK        → Usa resultado do backend (autoritativo)
Backend falha     → Compara localmente com faceDescriptor já carregado
Ambos falham      → Rejeita validação, mostra erro, reseta timer de pose
```

> O `faceDescriptor` (passado como prop) já vem do backend carregado no início do fluxo, então o fallback local é seguro como segunda opção.

---

## Rate Limiting

O `faceValidationLimiter` já existe em `backend/src/middleware/RateLimitMiddleware.ts`:

- **Limite**: 30 requisições / hora
- **Key**: `req.user.id` (por usuário, não por IP)
- **Uso**: Já aplicado em `GET /employees/face`, reaproveitar para `POST /employees/face/verify`

Com 3 steps × 1 validação cada = 3 chamadas por tentativa de check-in. 30/hora é mais que suficiente.

---

## Checklist de Implementação

- [ ] Verificar se `face-api.js` está no `backend/package.json` (ou implementar `euclideanDistance` manual)
- [ ] Backend: Adicionar rota `POST /employees/face/verify` em `employeesRoutes.ts`
- [ ] Backend: Adicionar método `verifyFace` em `EmployeesController.ts`
- [ ] Backend: Testar endpoint manualmente (curl/Postman)
- [ ] Frontend: Adicionar `verifyFace` em `api.employees` no `api.ts`
- [ ] Frontend: Adicionar `POSE_HOLD_DURATION_MS`, `poseHoldStartRef`, `isValidatingRef`
- [ ] Frontend: Refatorar `checkPose` — nova lógica de tempo + chamada backend + fallback
- [ ] Frontend: Resetar refs em troca de step
- [ ] Frontend: Remover código obsoleto (comparação local antiga)
- [ ] Testar fluxo completo: pose 2s → preenchimento circular → spin → backend → próxima etapa
- [ ] Testar cenário de erro: rosto diferente → backend recusa → sem fallback → reset
- [ ] Testar cenário de rede: backend offline → fallback local → funciona
- [ ] Testar rate limit: exceder 30 chamadas → bloquear
