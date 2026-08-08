# Plano de Implementacao - Novas Funcionalidades Viggo

## Visao Geral

| # | Funcionalidade | Complexidade | Dependencias | Esforco |
|---|---------------|-------------|--------------|---------|
| 1 | Geolocalizacao Obrigatoria | Baixa | Nenhuma | ~5h |
| 2 | Modo Totem | Media | Nenhuma | ~7h |
| 3 | Modo Offline | Alta | PWA (vite-plugin-pwa, IndexedDB) | ~8h |
| | **Total** | | | **~20h** |

**Ordem de implementacao:** Geolocalizacao -> Totem -> Offline

---

## Funcionalidade 1: Geolocalizacao Obrigatoria

### 1.1 Objetivo

A empresa configura coordenadas geograficas (latitude/longitude) e um raio minimo (em metros). O funcionario so pode bater ponto se estiver dentro desse raio em relacao a sede da empresa.

### 1.2 Fluxo Geral

```
FLUXO DE GEOLOCALIZACAO
========================

[Admin configura] --> [Salva no Company.settings] --> { lat, lng, radius, enabled }

[Funcionario clica] --> [Browser Geolocation API] --> [Coordenadas do func.]

                                                        |
                                                        v
                                              [Backend calcula distancia]
                                              [Haversine] e compara c/ raio

                                              DENTRO do raio? --> Prossegue
                                              FORA do raio?   --> Erro 403
```

### 1.3 Estrutura de Settings

O campo `Company.settings` (JSON) recebera a seguinte estrutura:

```json
{
  "geolocation": {
    "enabled": true,
    "latitude": -23.5505199,
    "longitude": -46.6333824,
    "radiusMeters": 100,
    "requireHighAccuracy": true
  }
}
```

**Campos:**

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `enabled` | boolean | Sim | Ativa/desativa a restricao geografica |
| `latitude` | number | Se enabled | Latitude da sede (-90 a 90) |
| `longitude` | number | Se enabled | Longitude da sede (-180 a 180) |
| `radiusMeters` | number | Se enabled | Raio maximo em metros (10 a 10.000) |
| `requireHighAccuracy` | boolean | Nao | Se true, usa GPS; se false, usa Wi-Fi/cell |

### 1.4 Arquivos a Modificar

#### Backend

| Arquivo | Tipo | Mudanca |
|---------|------|---------|
| `backend/src/utils/geolocation.ts` | **NOVO** | Funcao Haversine para calculo de distancia |
| `backend/src/controller/company/CompanyController.ts` | Editar | Adicionar `geolocation` ao schema Zod do `updateMe` |
| `backend/src/controller/CheckinController.ts` | Editar | Adicionar validacao de distancia antes de criar check-in |

#### Frontend

| Arquivo | Tipo | Mudanca |
|---------|------|---------|
| `frontend/src/services/api.ts` | Editar | Adicionar `geolocation` ao `CompanySettings` |
| `frontend/src/components/company/GeolocationTab.tsx` | **NOVO** | Formulario de configuracao de coordenadas |
| `frontend/src/pages/DashboardPage.tsx` | Editar | Adicionar aba "Geolocalizacao" |
| `frontend/src/pages/pontoPage.tsx` | Editar | Tratar erro `GEOLOCATION_OUT_OF_RANGE` |

### 1.5 Detalhes de Implementacao

#### 1.5.1 Funcao Haversine

**Arquivo:** `backend/src/utils/geolocation.ts`

```typescript
export function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371e3;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
```

#### 1.5.2 Schema Zod no CompanyController

**Arquivo:** `backend/src/controller/company/CompanyController.ts`

Adicionar `geolocation` ao schema de settings no `updateMe`:

```typescript
settings: z.object({
  // ... campos existentes ...
  geolocation: z.object({
    enabled: z.boolean(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    radiusMeters: z.number().min(10).max(10000).optional(),
    requireHighAccuracy: z.boolean().optional(),
  }).optional(),
}).optional(),
```

#### 1.5.3 Validacao no CheckinController

Inserir APOS buscar a empresa e ANTES de criar o check-in:

**Arquivo:** `backend/src/controller/CheckinController.ts`

```typescript
// Importar no topo do arquivo:
import { haversineDistance } from "../utils/geolocation.js";

// Inserir apos const company = ... e antes de const today = new Date():
const companySettings = company.settings as Record<string, unknown> | null;
const geoConfig = companySettings?.geolocation as {
  enabled?: boolean; latitude?: number;
  longitude?: number; radiusMeters?: number;
} | undefined;

if (geoConfig?.enabled && geoConfig.latitude != null
    && geoConfig.longitude != null && geoConfig.radiusMeters != null) {
  const distance = haversineDistance(latitude, longitude, geoConfig.latitude, geoConfig.longitude);
  if (distance > geoConfig.radiusMeters) {
    return res.status(403).json({
      message: `Voce esta a ${Math.round(distance)}m da empresa. Distancia maxima: ${geoConfig.radiusMeters}m.`,
      code: "GEOLOCATION_OUT_OF_RANGE",
      distance: Math.round(distance),
      maxDistance: geoConfig.radiusMeters,
    });
  }
}
```

#### 1.5.4 Frontend - CompanySettings

**Arquivo:** `frontend/src/services/api.ts`

```typescript
export interface CompanySettings {
  logo?: string | null;
  primaryColor?: string;
  timezone?: string;
  checkinToleranceMinutes?: number;
  lunchToleranceMinutes?: number;
  requirePhoto?: boolean;
  requireBiometry?: boolean;
  geolocation?: {
    enabled: boolean;
    latitude?: number;
    longitude?: number;
    radiusMeters?: number;
    requireHighAccuracy?: boolean;
  };
}
```

#### 1.5.5 Frontend - GeolocationTab

**Arquivo:** `frontend/src/components/company/GeolocationTab.tsx` (NOVO)

Componente com toggle, inputs de coordenadas, slider de raio, botao "Usar minha localizacao atual", link Google Maps e botao Salvar.

```typescript
import { useState, useEffect } from "react";
import { api } from "../../services/api";
import { useCompany } from "../../hooks/useCompany";
import { MapPin, Save, Crosshair } from "lucide-react";

export function GeolocationTab() {
  const { company, refreshCompany } = useCompany();
  const [enabled, setEnabled] = useState(false);
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [radiusMeters, setRadiusMeters] = useState(100);
  const [requireHighAccuracy, setRequireHighAccuracy] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (company?.settings?.geolocation) {
      const geo = company.settings.geolocation;
      setEnabled(geo.enabled ?? false);
      setLatitude(geo.latitude?.toString() ?? "");
      setLongitude(geo.longitude?.toString() ?? "");
      setRadiusMeters(geo.radiusMeters ?? 100);
      setRequireHighAccuracy(geo.requireHighAccuracy ?? false);
    }
  }, [company]);

  const handleGetCurrentPosition = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
      },
      (err) => alert("Nao foi possivel obter localizacao."),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await api.company.updateMe({
        settings: {
          geolocation: {
            enabled,
            latitude: enabled ? parseFloat(latitude) : undefined,
            longitude: enabled ? parseFloat(longitude) : undefined,
            radiusMeters: enabled ? radiusMeters : undefined,
            requireHighAccuracy,
          },
        },
      });
      await refreshCompany();
      alert("Configuracao salva!");
    } catch (error) {
      alert("Erro ao salvar.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-6">
      <div className="flex items-center gap-3">
        <MapPin className="text-emerald-600" size={24} />
        <div>
          <h3 className="text-lg font-bold text-slate-800">Geolocalizacao</h3>
          <p className="text-sm text-slate-400">Configure a localizacao para restringir batidas</p>
        </div>
      </div>
      <label className="flex items-center gap-3 cursor-pointer">
        <input type="checkbox" checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="w-5 h-5 rounded" />
        <span className="font-medium text-slate-700">Exigir proximidade para bater ponto</span>
      </label>
      {enabled && (
        <div className="space-y-4 pl-8 border-l-2 border-emerald-200">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Latitude</label>
              <input type="number" step="0.000001" value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Longitude</label>
              <input type="number" step="0.000001" value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm" />
            </div>
          </div>
          <button onClick={handleGetCurrentPosition}
            className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 text-sm font-medium">
            <Crosshair size={16} /> Usar minha localizacao atual
          </button>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Raio maximo: <strong>{radiusMeters}m</strong>
            </label>
            <input type="range" min="10" max="1000" step="10" value={radiusMeters}
              onChange={(e) => setRadiusMeters(Number(e.target.value))} className="w-full" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={requireHighAccuracy}
              onChange={(e) => setRequireHighAccuracy(e.target.checked)} className="w-4 h-4 rounded" />
            <span className="text-sm text-slate-600">GPS de alta precisao</span>
          </label>
          {latitude && longitude && (
            <a href={`https://www.google.com/maps?q=${latitude},${longitude}&z=17`}
              target="_blank" rel="noopener noreferrer"
              className="text-sm text-emerald-600 hover:underline">Ver no Google Maps</a>
          )}
        </div>
      )}
      <button onClick={handleSave} disabled={isSaving}
        className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold
                   hover:bg-emerald-700 transition-all disabled:opacity-50">
        <Save size={18} /> {isSaving ? "Salvando..." : "Salvar"}
      </button>
    </div>
  );
}
```

#### 1.5.6 DashboardPage - Adicionar Aba

**Arquivo:** `frontend/src/pages/DashboardPage.tsx`

```typescript
// Import:
import { GeolocationTab } from "../components/company/GeolocationTab";
import { MapPin } from "lucide-react";

// No array TABS:
const TABS = [
  "Funcionarios", "Presentes", "Folha Mensal", "Horarios",
  "Plano", "Convites", "Justificativas", "Geolocalizacao"
] as const;

// Na renderizacao:
{activeTab === "Geolocalizacao" && <GeolocationTab />}

// No botao da aba:
{tab === "Geolocalizacao" && <MapPin size={18} className="shrink-0" />}
```

#### 1.5.7 pontoPage.tsx - Tratar Erro

**Arquivo:** `frontend/src/pages/pontoPage.tsx`

No catch block de `handlePostCheckin`:

```typescript
if (error instanceof Error && error.message.includes("GEOLOCATION_OUT_OF_RANGE")) {
  alert("Voce esta longe demais da empresa. Aproxime-se para bater o ponto.");
  return;
}
```

---

## Funcionalidade 2: Modo Totem

### 2.1 Objetivo

Criar rota publica `/totem` onde o funcionario digita CPF, o sistema busca o usuario e abre camera para validacao facial. Sem login.

### 2.2 Fluxo Geral

```
FLUXO DO MODO TOTEM
====================

[1. Tela CPF]
   Funcionario digita CPF + seleciona tipo de ponto
        |
        v
[2. Backend: Busca por CPF]
   POST /employees/totem/face-token
   Hash do CPF --> Busca User --> Gera face token
        |
        v
[3. Camera / Liveness]
   Camera abre, LivenessChallenge (step "front")
   Blink + Pose validation
        |
        v
[4. Backend: Cria Check-in]
   POST /checkins/totem
   Valida face token + cria registro
        |
        v
[5. Comprovante]
   Exibe comprovante, reseta apos 8s
   Volta para tela de CPF
```

### 2.3 Arquivos a Modificar

#### Backend

| Arquivo | Tipo | Mudanca |
|---------|------|---------|
| `backend/src/controller/EmployeesController.ts` | Editar | Novo metodo `issueFaceTokenByCpf` |
| `backend/src/routes/employeesRoutes.ts` | Editar | Rota publica do totem |
| `backend/src/controller/CheckinController.ts` | Editar | Novo metodo `createCheckinTotem` |
| `backend/src/routes/checkinRoutes.ts` | Editar | Rota `POST /checkins/totem` |

#### Frontend

| Arquivo | Tipo | Mudanca |
|---------|------|---------|
| `frontend/src/pages/TotemPage.tsx` | **NOVO** | Pagina completa do totem |
| `frontend/src/routes/index.tsx` | Editar | Rota `/totem` publica |
| `frontend/src/services/api.ts` | Editar | Metodos do totem |

### 2.4 Detalhes de Implementacao

#### 2.4.1 Backend - Issue Face Token por CPF

**Arquivo:** `backend/src/controller/EmployeesController.ts`

```typescript
async issueFaceTokenByCpf(req: Request, res: Response) {
  const bodySchema = z.object({
    cpf: z.string().min(11).max(14),
    companyId: z.string().uuid(),
  });

  try {
    const { cpf, companyId } = bodySchema.parse(req.body);
    const formattedCpf = formatCpfDigits(cpf);
    const cpfHashValue = hashCpf(formattedCpf);

    const user = await prisma.user.findFirst({
      where: { cpfHash: cpfHashValue, companyId, status: "ACTIVE" },
      select: { id: true, faceDescriptor: true, name: true },
    });

    if (!user) {
      return res.status(404).json({ message: "Funcionario nao encontrado ou inativo." });
    }

    if (!user.faceDescriptor) {
      return res.status(403).json({
        code: "FACE_NOT_REGISTERED",
        message: "Registro facial pendente. Procure o administrador.",
      });
    }

    const descriptor = decryptFaceDescriptor(user.faceDescriptor as string);
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30_000);
    this.faceTokens.set(token, { descriptor, expiresAt });
    setTimeout(() => this.faceTokens.delete(token), 30_000);

    return res.json({ token, expiresIn: 30, userName: user.name });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Dados invalidos", errors: error.issues });
    }
    return res.status(500).json({ message: "Erro ao gerar token facial" });
  }
}
```

Imports necessarios:

```typescript
import { formatCpfDigits, hashCpf } from "../utils/cpfEncryption.js";
```

#### 2.4.2 Backend - Rota Publica Totem

**Arquivo:** `backend/src/routes/employeesRoutes.ts`

```typescript
// ANTES das rotas autenticadas:
router.post("/totem/face-token", (req, res) =>
  employeesController.issueFaceTokenByCpf(req, res)
);
```

#### 2.4.3 Backend - CreateCheckinTotem

**Arquivo:** `backend/src/controller/CheckinController.ts`

```typescript
async createCheckinTotem(req: Request, res: Response) {
  const bodySchema = z.object({
    cpf: z.string().min(11).max(14),
    companyId: z.string().uuid(),
    type: z.enum(["ENTRY", "LUNCH_START", "LUNCH_END", "EXIT"]),
    latitude: z.number(),
    longitude: z.number(),
    faceToken: z.string().uuid(),
    descriptor: z.array(z.number()).min(128).max(128),
  });

  try {
    const { cpf, companyId, type, latitude, longitude, faceToken, descriptor } =
      bodySchema.parse(req.body);

    // 1. Validar face token
    const stored = this.faceTokens.get(faceToken);
    if (!stored) {
      return res.status(401).json({ message: "Token facial invalido ou expirado" });
    }
    if (stored.expiresAt < new Date()) {
      this.faceTokens.delete(faceToken);
      return res.status(401).json({ message: "Token facial expirado" });
    }
    this.faceTokens.delete(faceToken);

    const inputDescriptor = new Float32Array(descriptor);
    const distance = euclideanDistance(inputDescriptor, stored.descriptor);
    if (distance >= 0.5) {
      return res.status(403).json({ success: false, message: "Rosto nao reconhecido" });
    }

    // 2. Buscar usuario por CPF
    const formattedCpf = formatCpfDigits(cpf);
    const cpfHashValue = hashCpf(formattedCpf);
    const user = await extendedPrisma.user.findFirst({
      where: { cpfHash: cpfHashValue, companyId },
      include: { workSchedule: true },
    });

    if (!user) {
      return res.status(404).json({ message: "Funcionario nao encontrado" });
    }

    // 3. Validacao de geolocalizacao
    const company = await extendedPrisma.company.findUnique({
      where: { id: companyId },
      select: { cnpj: true, name: true, settings: true },
    });

    if (!company) {
      return res.status(404).json({ message: "Empresa nao encontrada" });
    }

    const companySettings = company.settings as Record<string, unknown> | null;
    const geoConfig = companySettings?.geolocation as {
      enabled?: boolean; latitude?: number;
      longitude?: number; radiusMeters?: number;
    } | undefined;

    if (geoConfig?.enabled && geoConfig.latitude != null
        && geoConfig.longitude != null && geoConfig.radiusMeters != null) {
      const geoDistance = haversineDistance(latitude, longitude, geoConfig.latitude, geoConfig.longitude);
      if (geoDistance > geoConfig.radiusMeters) {
        return res.status(403).json({
          message: `Voce esta a ${Math.round(geoDistance)}m da empresa.`,
          code: "GEOLOCATION_OUT_OF_RANGE",
        });
      }
    }

    // 4. Verificar duplicata
    const today = new Date();
    const checkinExists = await extendedPrisma.checkIn.findFirst({
      where: {
        userId: user.id, type,
        createdAt: { gte: startOfDay(today), lte: endOfDay(today) },
      },
    });
    if (checkinExists) {
      return res.status(400).json({ message: `Ponto de ${type} ja registrado hoje.` });
    }

    // 5. Aplicar tolerancia CLT
    let effectiveCreatedAt = new Date();
    if (user.workSchedule && isDiaUtil(user.workSchedule.daysOfWeek, today)) {
      const minutosPrevistos = tipoParaHorarioPrevisto(type, user.workSchedule);
      if (minutosPrevistos !== null) {
        const horarioPrevisto = minutosParaDate(minutosPrevistos, today);
        const tolerancia = tipoParaTolerancia(type, user.workSchedule);
        const resultado = aplicarTolerancia(today, horarioPrevisto, tolerancia);
        effectiveCreatedAt = resultado.horarioEfetivo;
      }
    }

    // 6. Criar CheckIn
    const ano = currentYear();
    const checkin = await extendedPrisma.$transaction(async (tx) => {
      const nsr = await getNextNSR(companyId, ano);
      return tx.checkIn.create({
        data: {
          type, latitude, longitude, nsr, ano,
          userId: user.id, companyId,
          employerCnpj: company.cnpj,
          createdAt: effectiveCreatedAt,
        },
      });
    });

    // 7. Comprovante
    const comprovante = gerarComprovante({
      nsr: checkin.nsr, companyName: company.name,
      companyCnpj: company.cnpj, employeeName: user.name,
      employeeCpf: formatCpfDigits(decryptCpf(user.cpf ?? "")),
      checkinType: type, checkinDate: checkin.createdAt,
      latitude, longitude,
    });

    return res.status(201).json({
      checkin: { checkin },
      comprovante: comprovante.texto,
      hashVerificacao: comprovante.hashVerificacao,
      userName: user.name,
    });
  } catch (error) {
    if (error instanceof NsrLimitExceededError) {
      return res.status(503).json({ message: "Limite de registros atingido." });
    }
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Dados invalidos", errors: error.issues });
    }
    return res.status(500).json({ message: "Erro interno ao registrar ponto" });
  }
}
```

#### 2.4.4 Backend - Rota Totem Checkin

**Arquivo:** `backend/src/routes/checkinRoutes.ts`

```typescript
router.post("/totem", (req, res) => checkinController.createCheckinTotem(req, res));
```

#### 2.4.5 Frontend - API Service

**Arquivo:** `frontend/src/services/api.ts`

```typescript
totem: {
  issueFaceToken: (cpf: string, companyId: string) =>
    fetchApi<FaceTokenResponse & { userName: string }>(
      "/employees/totem/face-token",
      { method: "POST", body: JSON.stringify({ cpf, companyId }), requiresAuth: false }
    ),
  createCheckin: (data: {
    cpf: string; companyId: string; type: string;
    latitude: number; longitude: number;
    faceToken: string; descriptor: number[];
  }) =>
    fetchApi<CheckinCreateResponse>("/checkins/totem", {
      method: "POST", body: JSON.stringify(data), requiresAuth: false,
    }),
},
```

#### 2.4.6 Frontend - TotemPage

**Arquivo:** `frontend/src/pages/TotemPage.tsx` (NOVO)

3 estados: CPF -> Camera/Liveness -> Comprovante (auto-reset 8s)

```typescript
import { useState, useRef } from "react";
import { LivenessChallenge } from "../components/LivenessChallenge";
import { api } from "../services/api";
import { Search, LogIn, Utensils, Coffee, LogOut, RotateCcw } from "lucide-react";

type TotemStep = "cpf" | "camera" | "success" | "error";

export function TotemPage() {
  const [step, setStep] = useState<TotemStep>("cpf");
  const [cpf, setCpf] = useState("");
  const [selectedType, setSelectedType] = useState("ENTRY");
  const [faceToken, setFaceToken] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const [comprovante, setComprovante] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);

  const formatCpfInput = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  };

  const handleSearchEmployee = async () => {
    setIsProcessing(true);
    setErrorMessage("");
    try {
      const companyId = new URLSearchParams(window.location.search).get("companyId") || "";
      const data = await api.totem.issueFaceToken(cpf, companyId);
      setFaceToken(data.token);
      setUserName(data.userName);
      setStep("camera");

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
      });
      setVideoStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await new Promise((resolve) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = () => { videoRef.current?.play(); resolve(true); };
          }
        });
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Funcionario nao encontrado");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLivenessComplete = async (descriptor: Float32Array) => {
    stopCamera();
    setIsProcessing(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 });
      });
      const companyId = new URLSearchParams(window.location.search).get("companyId") || "";
      const response = await api.totem.createCheckin({
        cpf, companyId, type: selectedType,
        latitude: position.coords.latitude, longitude: position.coords.longitude,
        faceToken: faceToken!, descriptor: Array.from(descriptor),
      });
      setComprovante(response.comprovante);
      setStep("success");
      setTimeout(() => resetTotem(), 8000);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Erro ao registrar ponto");
      setStep("error");
    } finally {
      setIsProcessing(false);
    }
  };

  const stopCamera = () => {
    if (videoStream) { videoStream.getTracks().forEach((t) => t.stop()); setVideoStream(null); }
  };

  const resetTotem = () => {
    stopCamera();
    setStep("cpf"); setCpf(""); setFaceToken(null);
    setUserName(""); setComprovante(null); setErrorMessage("");
  };

  // ... renderizacao baseada no step ...
}
```

#### 2.4.7 Rota Publica no Frontend

**Arquivo:** `frontend/src/routes/index.tsx`

```typescript
import { TotemPage } from "../pages/TotemPage";

// Adicionar rota publica ANTES do switch de roles:
<Routes>
  <Route path="/totem" element={<TotemPage />} />
  {/* rotas existentes */}
</Routes>
```

---

## Funcionalidade 3: Modo Offline

### 3.1 Objetivo

Permitir que o funcionario bata ponto sem internet. Check-in salvo localmente (IndexedDB) e sincroniza quando voltar a conexao.

**Decisao:** Verificacao facial NAO e feita offline. Check-in fica pendente ate sync.

### 3.2 Fluxo Geral

```
FLUXO DO MODO OFFLINE
======================

[1. Funcionario clica "Registrar Ponto"]
   |
   +-- ONLINE --> Fluxo normal (geolocalizacao + facial + API)
   |
   +-- OFFLINE -->
        [2. Geolocalizacao local via GPS]
        [3. Salva no IndexedDB { status: "pending" }]
        [4. Mostra: "Ponto salvo offline"]
        [5. Quando voltar online...]
        [6. Sync automatico -> POST /checkins]
        [7. Notificacao: "X pontos sincronizados"]
```

### 3.3 Arquivos a Modificar

#### Backend

| Arquivo | Tipo | Mudanca |
|---------|------|---------|
| `backend/src/controller/CheckinController.ts` | Editar | Novo metodo `syncCheckins` |
| `backend/src/routes/checkinRoutes.ts` | Editar | Rota `POST /checkins/sync` |

#### Frontend

| Arquivo | Tipo | Mudanca |
|---------|------|---------|
| `frontend/vite.config.ts` | Editar | Adicionar `vite-plugin-pwa` |
| `frontend/src/utils/offlineDb.ts` | **NOVO** | Wrapper IndexedDB |
| `frontend/src/hooks/useOfflineSync.ts` | **NOVO** | Hook de sync offline |
| `frontend/src/components/OfflineIndicator.tsx` | **NOVO** | Indicador online/offline |
| `frontend/src/pages/pontoPage.tsx` | Editar | Integrar hook offline |
| `frontend/src/main.tsx` | Editar | Registrar Service Worker |
| `frontend/public/manifest.json` | **NOVO** | Manifest PWA |

### 3.4 Dependencias

```bash
cd frontend && npm install idb vite-plugin-pwa
```

### 3.5 Detalhes de Implementacao

#### 3.5.1 IndexedDB Wrapper

**Arquivo:** `frontend/src/utils/offlineDb.ts`

```typescript
import { openDB, type IDBPDatabase } from "idb";

interface ViggoDB {
  pendingCheckins: {
    key: string;
    value: {
      id: string;
      type: "ENTRY" | "LUNCH_START" | "LUNCH_END" | "EXIT";
      latitude: number;
      longitude: number;
      createdAt: string;
      userId: string;
      companyId: string;
      status: "pending" | "synced" | "error";
      errorMessage?: string;
      queuedAt: number;
    };
    indexes: { "by-status": string };
  };
}

async function getDB(): Promise<IDBPDatabase<ViggoDB>> {
  return openDB<ViggoDB>("viggo-offline", 1, {
    upgrade(db) {
      const store = db.createObjectStore("pendingCheckins", { keyPath: "id" });
      store.createIndex("by-status", "status");
    },
  });
}

export const offlineDb = {
  async queueCheckin(checkin: Omit<ViggoDB["pendingCheckins"]["value"], "status" | "queuedAt">) {
    const db = await getDB();
    await db.put("pendingCheckins", { ...checkin, status: "pending", queuedAt: Date.now() });
  },
  async getPendingCheckins() {
    const db = await getDB();
    return db.getAllFromIndex("pendingCheckins", "by-status", "pending");
  },
  async markSynced(id: string) {
    const db = await getDB();
    await db.update("pendingCheckins", id, { status: "synced" });
  },
  async markError(id: string, errorMessage: string) {
    const db = await getDB();
    await db.update("pendingCheckins", id, { status: "error", errorMessage });
  },
  async removeSynced() {
    const db = await getDB();
    const synced = await db.getAllFromIndex("pendingCheckins", "by-status", "synced");
    const tx = db.transaction("pendingCheckins", "readwrite");
    for (const item of synced) tx.store.delete(item.id);
    await tx.done;
  },
  async getPendingCount() {
    const db = await getDB();
    const all = await db.getAllFromIndex("pendingCheckins", "by-status", "pending");
    return all.length;
  },
};
```

#### 3.5.2 Hook useOfflineSync

**Arquivo:** `frontend/src/hooks/useOfflineSync.ts`

```typescript
import { useState, useEffect } from "react";
import { offlineDb } from "../utils/offlineDb";
import { api } from "../services/api";

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => { loadPendingCount(); }, []);

  useEffect(() => {
    if (isOnline && pendingCount > 0 && !isSyncing) syncPendingCheckins();
  }, [isOnline]);

  const loadPendingCount = async () => {
    setPendingCount(await offlineDb.getPendingCount());
  };

  const syncPendingCheckins = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const pending = await offlineDb.getPendingCheckins();
      for (const checkin of pending) {
        try {
          await api.checkins.create({
            type: checkin.type, latitude: checkin.latitude, longitude: checkin.longitude,
          });
          await offlineDb.markSynced(checkin.id);
        } catch (error) {
          await offlineDb.markError(checkin.id, error instanceof Error ? error.message : "Erro");
        }
      }
      await loadPendingCount();
      setTimeout(() => offlineDb.removeSynced(), 5000);
    } finally {
      setIsSyncing(false);
    }
  };

  const queueCheckin = async (data: { type: string; latitude: number; longitude: number }) => {
    const id = crypto.randomUUID();
    let userId = "", companyId = "";
    try {
      const userData = JSON.parse(localStorage.getItem("@viggo:user") || "{}");
      userId = userData.id || "";
      companyId = userData.companyId || "";
    } catch {}
    await offlineDb.queueCheckin({
      id, type: data.type as "ENTRY" | "LUNCH_START" | "LUNCH_END" | "EXIT",
      latitude: data.latitude, longitude: data.longitude,
      createdAt: new Date().toISOString(), userId, companyId,
    });
    await loadPendingCount();
  };

  return { isOnline, pendingCount, isSyncing, queueCheckin, syncPendingCheckins };
}
```

#### 3.5.3 Indicador Offline

**Arquivo:** `frontend/src/components/OfflineIndicator.tsx`

```typescript
import { useOfflineSync } from "../hooks/useOfflineSync";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";

export function OfflineIndicator() {
  const { isOnline, pendingCount, isSyncing, syncPendingCheckins } = useOfflineSync();

  if (isOnline && pendingCount === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl shadow-lg text-sm font-medium ${
        isOnline ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
      }`}>
        {isOnline ? (
          <>
            <Wifi size={16} />
            {isSyncing ? (
              <span className="flex items-center gap-1"><RefreshCw size={14} className="animate-spin" /> Sincronizando...</span>
            ) : (
              <button onClick={syncPendingCheckins} className="hover:underline">
                {pendingCount} ponto(s) pendente(s)
              </button>
            )}
          </>
        ) : (
          <>
            <WifiOff size={16} />
            <span>Offline ({pendingCount} pendente(s))</span>
          </>
        )}
      </div>
    </div>
  );
}
```

#### 3.5.4 Configuracao PWA

**Arquivo:** `frontend/vite.config.ts`

```typescript
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "models/**"],
      manifest: {
        name: "Viggo - Ponto Digital",
        short_name: "Viggo",
        display: "standalone",
        start_url: "/ponto",
        theme_color: "#059669",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /\/models\//,
            handler: "CacheFirst",
            options: { cacheName: "face-models", expiration: { maxEntries: 20, maxAgeSeconds: 30 * 24 * 60 * 60 } },
          },
        ],
      },
    }),
  ],
});
```

#### 3.5.5 Registrar Service Worker

**Arquivo:** `frontend/src/main.tsx`

```typescript
import { registerSW } from "virtual:pwa-register";

const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm("Nova versao disponivel. Atualizar?")) updateSW(true);
  },
  onOfflineReady() {
    console.log("Aplicacao pronta para uso offline");
  },
});
```

#### 3.5.6 Integracao no pontoPage

**Arquivo:** `frontend/src/pages/pontoPage.tsx`

```typescript
import { useOfflineSync } from "../hooks/useOfflineSync";
import { OfflineIndicator } from "../components/OfflineIndicator";

// Dentro do componente:
const { isOnline, queueCheckin } = useOfflineSync();

// Em handlePostCheckin, apos obter geolocalizacao:
if (!isOnline) {
  await queueCheckin({ type, latitude, longitude });
  setMessage("Ponto salvo offline. Sincronizara quando voltar online.");
  setIsSuccess(true);
  setTimeout(() => { setIsSuccess(false); setVideoOpen(false); }, 3000);
  return;
}

// No return do componente, adicionar:
<OfflineIndicator />
```

#### 3.5.7 Backend - Endpoint de Sync

**Arquivo:** `backend/src/controller/CheckinController.ts`

```typescript
async syncCheckins(req: Request, res: Response) {
  const bodySchema = z.object({
    checkins: z.array(z.object({
      id: z.string().uuid(),
      type: z.enum(["ENTRY", "LUNCH_START", "LUNCH_END", "EXIT"]),
      latitude: z.number(),
      longitude: z.number(),
      createdAt: z.string().datetime(),
    })),
  });

  try {
    const { checkins } = bodySchema.parse(req.body);
    const companyId = req.user.companyId;
    const userId = req.user.id;

    const company = await extendedPrisma.company.findUnique({
      where: { id: companyId },
      select: { cnpj: true, name: true },
    });

    if (!company) return res.status(404).json({ message: "Empresa nao encontrada" });

    const results: { id: string; success: boolean; error?: string }[] = [];

    for (const checkin of checkins) {
      try {
        const checkinDate = parseISO(checkin.createdAt);
        const exists = await extendedPrisma.checkIn.findFirst({
          where: {
            userId, type: checkin.type,
            createdAt: { gte: startOfDay(checkinDate), lte: endOfDay(checkinDate) },
          },
        });
        if (exists) {
          results.push({ id: checkin.id, success: false, error: "Ponto ja registrado" });
          continue;
        }

        const ano = currentYear();
        await extendedPrisma.$transaction(async (tx) => {
          const nsr = await getNextNSR(companyId, ano);
          await tx.checkIn.create({
            data: {
              type: checkin.type, latitude: checkin.latitude, longitude: checkin.longitude,
              nsr, ano, userId, companyId, employerCnpj: company.cnpj, createdAt: checkinDate,
            },
          });
        });
        results.push({ id: checkin.id, success: true });
      } catch (error) {
        results.push({ id: checkin.id, success: false, error: error instanceof Error ? error.message : "Erro" });
      }
    }

    return res.json({ results });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Dados invalidos", errors: error.issues });
    }
    return res.status(500).json({ message: "Erro ao sincronizar" });
  }
}
```

---

## Riscos e Mitigacoes

| Risco | Impacto | Mitigacao |
|-------|---------|-----------|
| GPS baixa precisao indoor | Funcionario nao bate ponto | Padrao requireHighAccuracy: false |
| Offline queue cresce indefinidamente | Storage estoura | Limitar 50 check-ins; aviso ao usuario |
| Totem com CPF acessivel | Seguranca menor | Requer facial obrigatoria; auditoria |
| Service Worker cache stale | Versao antiga | autoUpdate com prompt |
| Conexao intermitente | Check-ins duplicados | Verificacao de duplicata no backend |

---

## Estimativa de Esforco

| Funcionalidade | Backend | Frontend | Testes | Total |
|---------------|---------|----------|--------|-------|
| Geolocalizacao | 2h | 3h | 1h | **6h** |
| Modo Totem | 3h | 4h | 1h | **8h** |
| Modo Offline | 2h | 6h | 2h | **10h** |
| **Total** | **7h** | **13h** | **4h** | **24h** |

---

## Ordem de Implementacao

### Fase 1: Geolocalizacao (6h)
1. Criar `backend/src/utils/geolocation.ts`
2. Atualizar schema Zod no `CompanyController.ts`
3. Adicionar validacao no `CheckinController.ts`
4. Atualizar `CompanySettings` no `api.ts`
5. Criar `GeolocationTab.tsx`
6. Adicionar aba no `DashboardPage.tsx`
7. Tratar erro no `pontoPage.tsx`
8. Testes

### Fase 2: Modo Totem (8h)
1. Adicionar `issueFaceTokenByCpf` no `EmployeesController.ts`
2. Adicionar rota publica no `employeesRoutes.ts`
3. Adicionar `createCheckinTotem` no `CheckinController.ts`
4. Adicionar rota totem no `checkinRoutes.ts`
5. Atualizar `api.ts` com metodos do totem
6. Criar `TotemPage.tsx`
7. Adicionar rota `/totem` no `index.tsx`
8. Testes

### Fase 3: Modo Offline (10h)
1. Instalar `idb` e `vite-plugin-pwa`
2. Criar `offlineDb.ts`
3. Criar `useOfflineSync.ts`
4. Criar `OfflineIndicator.tsx`
5. Configurar PWA no `vite.config.ts`
6. Registrar SW no `main.tsx`
7. Integrar offline no `pontoPage.tsx`
8. Criar endpoint `syncCheckins` no backend
9. Testes
