# Plano de Centralização das Chamadas API

## Problema Identificado

Arquivos fazendo `fetch` direto ao invés de usar `api.ts` centralizado:

| Arquivo | Fetch Direto | Endpoint | Status |
|---------|--------------|----------|--------|
| `pontoPage.tsx` | ✅ | `GET /employees/face` | ✅ Concluído |
| `pontoPage.tsx` | ✅ | `POST /checkins` | ✅ Concluído |
| `pontoPage.tsx` | ✅ | `GET /checkins` | ✅ Concluído |
| `pontoViewPage.tsx` | ✅ | `GET /checkins?date=` | ✅ Concluído |
| `RegisterFace.tsx` | ✅ | `PUT /sessions/:id` (face descriptor) | ✅ Concluído |
| `signupPage.tsx` | ✅ | `POST /sessions` (legacy) | ✅ Removido |

---

## Endpoints Adicionados no `api.ts`

### 1. `api.employees` - Novo namespace

```typescript
employees: {
  // Busca descriptor facial do funcionário logado
  getFaceDescriptor: () => 
    fetchApi<FaceDescriptorResponse>("/employees/face"),
  
  // Atualiza descriptor facial do usuário
  updateFaceDescriptor: (userId: string, descriptor: number[]) =>
    fetchApi<User>(`/sessions/${userId}`, {
      method: "PUT",
      body: JSON.stringify({ faceDescriptor: descriptor }),
    }),
},
```

**Types necessários:**
```typescript
export interface FaceDescriptorResponse {
  // O backend retorna objeto com índices numéricos: { "0": 0.1, "1": -0.05, ... }
  [key: string]: number;
}
```

---

### 2. `api.checkins` - Novo namespace

```typescript
checkins: {
  // Registra novo check-in
  create: (data: CheckinCreateDto) =>
    fetchApi<CheckinResponse>("/checkins", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  
  // Lista check-ins (opcionalmente filtrado por data)
  list: (date?: string) =>
    fetchApi<CheckinResponse[]>(
      `/checkins${date ? `?date=${date}` : ""}`
    ),
},
```

**Types necessários:**
```typescript
export interface CheckinCreateDto {
  type: "ENTRY" | "LUNCH_START" | "LUNCH_END" | "EXIT";
  latitude: number;
  longitude: number;
}

export interface CheckinResponse {
  id: string;
  createdAt: string;
  type: "ENTRY" | "LUNCH_START" | "LUNCH_END" | "EXIT";
  latitude: number;
  longitude: number;
  userId: string;
  companyId: string;
}
```

---

## Atualizações nos Componentes

### `pontoPage.tsx`
```typescript
// ANTES (linha 89)
const response = await fetch(`${api.auth.login.toString().replace("/sessions/login", "")}/employees/face`, ...)

// DEPOIS
const data = await api.employees.getFaceDescriptor()
const savedDescriptor = new Float32Array(Object.values(data)) as Float32Array;

// ANTES (linha 179)
const response = await fetch(`${baseUrl}/checkins`, { method: "POST", ... })

// DEPOIS
await api.checkins.create(pendingCheckin)

// ANTES (linha 231)
const response = await fetch(`${baseUrl}/checkins`, ...)

// DEPOIS
const data = await api.checkins.list()
setCheckins(data)
```

### `pontoViewPage.tsx`
```typescript
// ANTES (linha 29)
const response = await fetch(`${baseUrl}/checkins?date=${date}`, ...)

// DEPOIS
const data = await api.checkins.list(date)
setCheckins(data)
```

### `RegisterFace.tsx`
```typescript
// ANTES (linha 71)
const response = await fetch(`${api.auth.login.toString().replace("/sessions/login", "")}/sessions/${user.id}`, {
  method: "PUT",
  body: JSON.stringify({ faceDescriptor: Array.from(descriptor) })
})

// DEPOIS
await api.employees.updateFaceDescriptor(user.id, Array.from(descriptor))
```

### `signupPage.tsx` - **REMOVIDO**

Este arquivo usava `POST /sessions` (legacy) que criava usuário na empresa hardcoded `id: "1"`.

**Decisão:** Arquivo removido. O fluxo correto é `POST /companies/signup` via `api.auth.signup()`.

---

## Ordem de Implementação (Concluída)

1. ✅ **Adicionar types** no final do `api.ts` (`FaceDescriptorResponse`, `CheckinCreateDto`, `CheckinResponse`)
2. ✅ **Adicionar namespaces** `api.employees` e `api.checkins`
3. ✅ **Atualizar `pontoPage.tsx`** - 3 chamadas
4. ✅ **Atualizar `pontoViewPage.tsx`** - 1 chamada
5. ✅ **Atualizar `RegisterFace.tsx`** - 1 chamada
6. ✅ **Remover `signupPage.tsx`** - legacy endpoint não utilizado

---

## Verificações Realizadas

- ✅ **npm run lint** - Apenas warnings/errors pré-existentes (não relacionados à centralização)
- ✅ **npm run build** - Build bem-sucedido (1.75s)
- ✅ **npx tsc --noEmit** - TypeScript check passou sem erros

---

## Estimativa vs Real

| Item | Estimativa | Real |
|------|------------|------|
| Types + namespaces | ~15 min | ~10 min |
| 3 componentes atualizados | ~20 min | ~15 min |
| Decisão signupPage | ~5 min | ~2 min |
| Testes/Build | ~15 min | ~5 min |

**Total estimado: ~55 min** | **Total real: ~32 min**