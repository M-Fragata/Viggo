import { useEffect, useRef, useState, useCallback } from "react";
import { LogIn, Utensils, Coffee, LogOut, MonitorSmartphone, ShieldCheck, ArrowLeft, Loader2, Camera, User, Radio, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError, type TotemVerifyResponse } from "../../services/api";
import { LivenessChallenge } from "../../components/LivenessChallenge";
import { preloadFaceModels, areFaceModelsLoaded } from "../../utils/faceModels";
import { saveOfflineCheckin, getPendingOfflineCheckins, removeOfflineCheckin, type OfflineCheckin } from "../../utils/offlineQueue";

type CheckinType = "ENTRY" | "LUNCH_START" | "LUNCH_END" | "EXIT";

const CHECKIN_OPTIONS: { label: string; type: CheckinType; icon: React.ReactNode }[] = [
  { label: "Entrada", type: "ENTRY", icon: <LogIn className="text-emerald-500" size={32} /> },
  { label: "Início Almoço", type: "LUNCH_START", icon: <Utensils className="text-emerald-500" size={32} /> },
  { label: "Retorno Almoço", type: "LUNCH_END", icon: <Coffee className="text-emerald-500" size={32} /> },
  { label: "Saída", type: "EXIT", icon: <LogOut className="text-red-500" size={32} /> },
];

type Screen =
  | { name: "idle" }
  | { name: "login" }
  | { name: "select-type" }
  | { name: "camera" }
  | { name: "register-face" }
  | { name: "success"; comprovante?: string; isOffline?: boolean; offlineRecord?: OfflineCheckin }
  | { name: "exit" };

export function TotemPage() {
  const [screen, setScreen] = useState<Screen>({ name: "idle" });
  const [clock, setClock] = useState(new Date());
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [message, setMessage] = useState("Iniciando validação...");
  const [faceToken, setFaceToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [checkinsToday, setCheckinsToday] = useState<Array<{ id: string; type: CheckinType; createdAt: string }>>([]);
  const [pendingType, setPendingType] = useState<CheckinType | null>(null);
  const [pendingCoords, setPendingCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [needsFaceRegistration, setNeedsFaceRegistration] = useState(false);
  const [totemAuthMode, setTotemAuthMode] = useState<string>("FRONTAL_ONLY");
  const [exitPin, setExitPin] = useState("");
  const [isExiting, setIsExiting] = useState(false);
  const [showRecover, setShowRecover] = useState(false);
  const [recoverEmail, setRecoverEmail] = useState("");
  const [recoverPassword, setRecoverPassword] = useState("");
  const [isRecovering, setIsRecovering] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    preloadFaceModels().catch((err) => {
      console.error("Erro ao pré-carregar modelos no Totem:", err);
    });
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("@viggo:totem");
    const expiresAt = localStorage.getItem("@viggo:totem:expiresAt");

    if (!token) {
      window.location.href = "/totem";
      return;
    }

    if (expiresAt && Number(expiresAt) < Date.now()) {
      localStorage.removeItem("@viggo:totem");
      localStorage.removeItem("@viggo:totem:expiresAt");
      window.location.href = "/totem";
      return;
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  function resetToIdle() {
    stopCamera();
    setScreen({ name: "idle" });
    setEmail("");
    setPassword("");
    setError(null);
    setFaceToken(null);
    setUserId(null);
    setUserName(null);
    setCheckinsToday([]);
    setPendingType(null);
    setPendingCoords(null);
    setPendingUserId(null);
    setNeedsFaceRegistration(false);
    setExitPin("");
    setIsExiting(false);
    setShowRecover(false);
    setRecoverEmail("");
    setRecoverPassword("");
    setIsRecovering(false);
  }

  async function startCamera(targetScreen: "camera" | "register-face" = "camera") {
    try {
      if (!areFaceModelsLoaded()) {
        await preloadFaceModels();
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
      });

      streamRef.current = stream;
      setMessage(targetScreen === "register-face" ? "Centralize seu rosto para o cadastro" : "Centralize seu rosto");
      if (targetScreen === "register-face") {
        setScreen({ name: "register-face" });
      } else {
        setScreen({ name: "camera" });
      }
    } catch (err) {
      console.error("Erro ao acessar a webcam:", err);
      const msg = "Não foi possível acessar a câmera. Verifique as permissões do dispositivo.";
      setError(msg);
      toast.error(msg);
      setScreen({ name: "select-type" });
    }
  }

  async function handleVerify() {
    setError(null);
    setIsVerifying(true);
    setNeedsFaceRegistration(false);
    try {
      const data: TotemVerifyResponse = await api.totem.verify(email, password);
      setFaceToken(data.faceToken);
      setUserId(data.userId);
      setUserName(data.userName);
      setCheckinsToday((data.checkinsToday as Array<{ id: string; type: CheckinType; createdAt: string }>) || []);
      if (data.totemAuthMode) {
        setTotemAuthMode(data.totemAuthMode);
      }
      setIsVerifying(false);
      setScreen({ name: "select-type" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao verificar credenciais.";
      setError(msg);
      toast.error(msg);
      if (err instanceof ApiError && err.code === "FACE_NOT_REGISTERED") {
        setPendingUserId(typeof err.data?.userId === "string" ? err.data.userId : null);
        setNeedsFaceRegistration(true);
      }
      setIsVerifying(false);
      stopCamera();
    }
  }

  const handleVideoRef = (el: HTMLVideoElement | null) => {
    videoRef.current = el;
    if (el && streamRef.current && el.srcObject !== streamRef.current) {
      el.srcObject = streamRef.current;
      el.play().catch((err) => console.error("Erro ao reproduzir stream da câmera no Totem:", err));
    }
  };

  async function handleStartFaceRegister() {
    setError(null);
    setIsVerifying(true);
    try {
      if (!areFaceModelsLoaded()) {
        toast.info("Carregando validação facial...");
        await preloadFaceModels();
      }
      await startCamera("register-face");
    } catch (err) {
      console.error("Erro ao iniciar cadastro facial:", err);
      toast.error("Falha ao carregar modelos para cadastro facial.");
    } finally {
      setIsVerifying(false);
    }
  }

  async function handleFaceRegistered(descriptor: Float32Array) {
    if (!pendingUserId) return;

    stopCamera();
    setIsRegistering(true);
    setMessage("Salvando cadastro facial...");

    try {
      await api.totem.registerFace(pendingUserId, Array.from(descriptor));
      setPendingUserId(null);
      setNeedsFaceRegistration(false);
      setError(null);
      setIsRegistering(false);
      toast.success("Biometria facial cadastrada com sucesso!");
      await handleVerify();
    } catch (err) {
      console.error("Erro ao salvar cadastro facial no totem:", err);
      const msg = err instanceof Error ? err.message : "Erro ao salvar cadastro facial. Tente novamente.";
      setError(msg);
      toast.error(msg);
      setIsRegistering(false);
      setScreen({ name: "login" });
    }
  }

  async function handleFaceVerified() {
    if (!faceToken || !pendingCoords || !pendingType || !userId) return;

    stopCamera();
    setIsRegistering(true);
    setMessage("Registrando ponto...");

    try {
      const response = await api.totem.checkin({
        userId,
        type: pendingType,
        latitude: pendingCoords.latitude,
        longitude: pendingCoords.longitude,
        faceToken,
      });

      toast.success("Ponto registrado com sucesso!");
      setScreen({ name: "success", comprovante: response.comprovante });
      setIsRegistering(false);
    } catch (err) {
      console.error("Erro ao registrar ponto no totem:", err);

      const isNetworkError =
        !navigator.onLine ||
        (err instanceof Error &&
          (err.message.includes("fetch") ||
           err.message.includes("Network") ||
           err.message.includes("Failed") ||
           err.message.includes("conexão")));

      if (isNetworkError && userId && pendingType) {
        try {
          const offlineItem = await saveOfflineCheckin({
            userId,
            userName: userName || undefined,
            type: pendingType,
            latitude: pendingCoords.latitude,
            longitude: pendingCoords.longitude,
          });

          toast.info("Ponto registrado offline!", {
            description: "Sua marcação foi salva com segurança no totem e será sincronizada automaticamente assim que a conexão retornar.",
            duration: 6000,
          });

          setScreen({
            name: "success",
            isOffline: true,
            offlineRecord: offlineItem,
          });
          setIsRegistering(false);
          return;
        } catch (offlineErr) {
          console.error("Erro ao salvar ponto offline no totem:", offlineErr);
        }
      }

      const msg = err instanceof Error ? err.message : "Erro ao registrar ponto. Tente novamente.";
      setError(msg);
      toast.error(msg, { duration: 6000 });
      setIsRegistering(false);
      resetToIdle();
    }
  }

  const syncTotemOfflineCheckins = useCallback(async () => {
    if (!navigator.onLine) return;
    try {
      const pending = await getPendingOfflineCheckins();
      if (pending.length === 0) return;

      const itemsToSync = pending.map((p) => ({
        id: p.id,
        type: p.type,
        timestamp: p.timestamp,
        latitude: p.latitude,
        longitude: p.longitude,
        accuracy: p.accuracy,
        hash: p.hash,
      }));

      const result = await api.checkins.syncOffline(itemsToSync);
      for (const item of result.synced) {
        await removeOfflineCheckin(item.id);
      }

      toast.success("Marcações offline sincronizadas!", {
        description: `${result.synced.length} ponto(s) foram sincronizados com sucesso no servidor.`,
      });
    } catch (err) {
      console.warn("Sincronização offline no totem postergada:", err);
    }
  }, []);

  useEffect(() => {
    syncTotemOfflineCheckins();
    window.addEventListener("online", syncTotemOfflineCheckins);
    return () => window.removeEventListener("online", syncTotemOfflineCheckins);
  }, [syncTotemOfflineCheckins]);

  function handleFaceCancel() {
    stopCamera();
    toast.info("Validação facial cancelada");
    setError("Validação cancelada");
    setScreen({ name: "select-type" });
  }

  function handleFaceRegisterCancel() {
    stopCamera();
    toast.info("Cadastro facial cancelado");
    setError("Cadastro facial cancelado");
    setScreen({ name: "login" });
  }

  function handleExit() {
    setScreen({ name: "exit" });
    setExitPin("");
    setError(null);
  }

  async function confirmExit() {
    setError(null);
    setIsExiting(true);
    try {
      await api.totem.deactivate(exitPin);
      toast.success("Modo totem desativado");
      localStorage.removeItem("@viggo:totem");
      localStorage.removeItem("@viggo:totem:expiresAt");
      window.location.href = "/totem";
    } catch (err) {
      const msg = err instanceof Error ? err.message : "PIN incorreto.";
      setError(msg);
      toast.error(msg);
      setIsExiting(false);
    }
  }

  function handleShowRecover() {
    setShowRecover(true);
    setError(null);
  }

  function handleBackToPin() {
    setShowRecover(false);
    setError(null);
  }

  async function handleRecover() {
    setError(null);
    if (!recoverEmail.trim() || !recoverPassword) {
      const msg = "Informe email e senha de um administrador.";
      setError(msg);
      toast.error(msg);
      return;
    }
    setIsRecovering(true);
    try {
      await api.totem.recover(recoverEmail.trim(), recoverPassword);
      toast.success("Acesso recuperado com sucesso");
      localStorage.removeItem("@viggo:totem");
      localStorage.removeItem("@viggo:totem:expiresAt");
      window.location.href = "/totem";
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Não foi possível recuperar o acesso.";
      setError(msg);
      toast.error(msg);
      setIsRecovering(false);
    }
  }

  function getLocation(): Promise<{ latitude: number; longitude: number }> {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
        (err) => reject(err),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  }

  async function handleStartCheckin() {
    setError(null);
    setScreen({ name: "login" });
  }

  async function handlePickType(type: CheckinType) {
    setPendingType(type);
    setIsVerifying(true);
    setError(null);

    let coords = pendingCoords;
    if (!coords) {
      try {
        coords = await getLocation();
        setPendingCoords(coords);
      } catch (err) {
        console.warn("Localização não obtida no totem:", err);
        coords = { latitude: 0, longitude: 0 };
        setPendingCoords(coords);
      }
    }

    if (totemAuthMode === "CREDENTIALS_ONLY") {
      if (!userId || !faceToken) {
        setIsVerifying(false);
        return;
      }
      setIsRegistering(true);
      setMessage("Registrando ponto...");
      try {
        const response = await api.totem.checkin({
          userId,
          type,
          latitude: coords.latitude,
          longitude: coords.longitude,
          faceToken,
        });
        toast.success("Ponto registrado com sucesso!");
        setScreen({ name: "success", comprovante: response.comprovante });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erro ao registrar ponto.";
        toast.error(msg, { duration: 6000 });
        setError(msg);
      } finally {
        setIsRegistering(false);
        setIsVerifying(false);
      }
      return;
    }

    try {
      if (!areFaceModelsLoaded()) {
        await preloadFaceModels();
      }
      await startCamera("camera");
    } catch (err) {
      console.error("Erro ao preparar câmera:", err);
      toast.error("Falha ao inicializar validação facial. Tente novamente.");
    } finally {
      setIsVerifying(false);
    }
  }

  const time = clock.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const date = clock.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col overflow-hidden select-none">
      <div className="flex-1 flex flex-col">
        {screen.name === "idle" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-10 p-8">
            <div className="text-center space-y-2">
              <MonitorSmartphone className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
              <h1 className="text-4xl font-bold tracking-tight">Modo Totem</h1>
              <p className="text-slate-400">Registro de ponto com reconhecimento facial</p>
            </div>

            <div className="text-center space-y-1">
              <div className="text-7xl font-bold tabular-nums text-emerald-400">{time}</div>
              <div className="text-slate-300 capitalize text-lg">{date}</div>
            </div>

            <button
              onClick={handleStartCheckin}
              disabled={isVerifying}
              className="cursor-pointer w-full max-w-2xl py-5 bg-emerald-500 hover:bg-emerald-600 text-white text-xl font-bold rounded-2xl shadow-2xl shadow-emerald-500/20 transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-3"
            >
              {isVerifying ? <Loader2 className="animate-spin" size={24} /> : ""}
              Bater Ponto
            </button>

            <button
              onClick={handleExit}
              className="flex items-center gap-2 text-slate-500 hover:text-slate-300 transition-colors text-sm cursor-pointer"
            >
              <ShieldCheck size={16} />
              Sair do modo totem (administrador)
            </button>
          </div>
        )}

        {screen.name === "login" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-8 p-6 md:p-8 max-w-xl mx-auto w-full">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-2">
                <User size={28} />
              </div>
              <h2 className="text-3xl font-bold">Identificação</h2>
              <p className="text-slate-400">Informe seu email e senha para acessar os pontos</p>
            </div>

            <div className="w-full space-y-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email do colaborador"
                autoFocus
                className="w-full px-4 py-4 rounded-xl bg-slate-900 border border-slate-700 focus:border-emerald-400 focus:outline-none text-lg placeholder:text-slate-500"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                placeholder="Senha"
                className="w-full px-4 py-4 rounded-xl bg-slate-900 border border-slate-700 focus:border-emerald-400 focus:outline-none text-lg placeholder:text-slate-500"
              />

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl p-3">
                  {error}
                </div>
              )}

              {needsFaceRegistration && pendingUserId && (
                <button
                  onClick={handleStartFaceRegister}
                  disabled={isVerifying}
                  className="w-full py-4 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-sky-500/20 active:scale-95"
                >
                  <Camera size={20} />
                  Cadastrar Biometria Facial
                </button>
              )}

              <button
                onClick={handleVerify}
                disabled={isVerifying || !email || !password}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95"
              >
                {isVerifying ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Identificando...
                  </>
                ) : (
                  "Continuar"
                )}
              </button>

              <button
                onClick={resetToIdle}
                className="w-full text-slate-400 hover:text-white transition-colors text-sm py-2 flex items-center justify-center gap-2 cursor-pointer"
              >
                <ArrowLeft size={16} />
                Cancelar
              </button>
            </div>
          </div>
        )}

        {screen.name === "select-type" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-8 p-6 md:p-8 max-w-4xl mx-auto w-full">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold">
                {userName ? `Olá, ${userName}` : "Selecione a marcação"}
              </h2>
              <p className="text-slate-400">
                Selecione o tipo de ponto a ser registrado hoje
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
              {CHECKIN_OPTIONS.map((option) => {
                const existing = checkinsToday.find((c) => c.type === option.type);
                const hasRegistered = !!existing;
                const checkinTime = existing
                  ? new Date(existing.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  : null;

                const isCurrentPreparing = isVerifying && pendingType === option.type;

                return (
                  <button
                    key={option.type}
                    onClick={() => !hasRegistered && handlePickType(option.type)}
                    disabled={hasRegistered || isVerifying}
                    className={`rounded-2xl p-6 flex flex-col items-center justify-between gap-4 transition-all border ${
                      hasRegistered
                        ? "bg-slate-900/40 border-slate-800 opacity-60 cursor-not-allowed"
                        : isCurrentPreparing
                        ? "bg-emerald-950/40 border-emerald-500 scale-[1.01] cursor-wait shadow-lg shadow-emerald-500/10"
                        : "bg-slate-900 border-slate-700 hover:border-emerald-400 hover:scale-[1.02] cursor-pointer shadow-lg active:scale-95"
                    }`}
                  >
                    <div className="text-3xl">
                      {isCurrentPreparing ? <Loader2 className="animate-spin text-emerald-400" size={32} /> : option.icon}
                    </div>
                    <div className="text-center space-y-1">
                      <span className="text-xl font-bold block">{option.label}</span>
                      <span className={`text-xs font-medium block ${hasRegistered ? "text-slate-400" : "text-emerald-400"}`}>
                        {hasRegistered
                          ? `✅ Registrado às ${checkinTime}`
                          : isCurrentPreparing
                          ? "Preparando câmera..."
                          : "Toque para registrar"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              onClick={resetToIdle}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors py-2 px-4 rounded-xl hover:bg-slate-900 cursor-pointer"
            >
              <ArrowLeft size={18} />
              Cancelar / Trocar Colaborador
            </button>
          </div>
        )}

        {screen.name === "camera" && (
          <div className="fixed inset-0 w-full h-full bg-black z-50 overflow-hidden flex flex-col items-center justify-center">
            {/* Barra superior de instruções */}
            <div className="absolute top-0 left-0 right-0 z-[100] bg-emerald-500 w-full shadow-lg p-3 flex items-center justify-center">
              <p className="text-white text-sm md:text-lg font-bold text-center uppercase tracking-wider">
                {message}
              </p>
            </div>

            {/* Vídeo em tela cheia com preenchimento total e sem letterbox */}
            <video
              ref={handleVideoRef}
              autoPlay
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
              style={{ transform: "scaleX(-1)" }}
            />

            {/* Máscara oval de centralização */}
            <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
              <div
                className="md:w-[360px] md:h-[460px] w-[80%] h-[60%] shadow-[0_0_0_9999px_rgba(0,0,0,0.7)] border-4 border-dashed border-emerald-400/60"
                style={{ borderRadius: "50% / 40%" }}
              />
            </div>

            {faceToken && (
              <LivenessChallenge
                videoRef={videoRef}
                faceToken={faceToken}
                facialMode={totemAuthMode === "FULL_LIVENESS" ? "FULL_LIVENESS" : "FRONTAL_ONLY"}
                verifyOverride={async (descriptor) => {
                  return api.totem.verifyFace(faceToken, Array.from(descriptor));
                }}
                onComplete={handleFaceVerified}
                onCancel={handleFaceCancel}
                onModelsLoaded={() => setMessage("Centralize seu rosto")}
                onStepChange={(msg) => setMessage(msg)}
              />
            )}

            {/* Botão de Cancelar no rodapé da câmera */}
            <div className="absolute bottom-6 left-0 right-0 z-[100] flex justify-center px-4 pointer-events-auto">
              <button
                onClick={handleFaceCancel}
                className="px-6 py-3 bg-slate-900/80 hover:bg-slate-900 border border-white/20 text-white rounded-full font-bold transition-all active:scale-95 text-sm cursor-pointer shadow-xl backdrop-blur-sm"
              >
                Cancelar
              </button>
            </div>

            {isRegistering && (
              <div className="absolute inset-0 z-[110] bg-emerald-500/95 flex flex-col items-center justify-center">
                <Loader2 size={48} className="animate-spin text-white mb-4" />
                <h2 className="text-white text-2xl font-bold">Registrando Ponto...</h2>
                <p className="text-emerald-200 mt-2">{message}</p>
              </div>
            )}
          </div>
        )}

        {screen.name === "register-face" && (
          <div className="fixed inset-0 w-full h-full bg-black z-50 overflow-hidden flex flex-col items-center justify-center">
            {/* Barra superior de instruções em azul */}
            <div className="absolute top-0 left-0 right-0 z-[100] bg-sky-500 w-full shadow-lg p-3 flex items-center justify-center">
              <p className="text-white text-sm md:text-lg font-bold text-center uppercase tracking-wider">
                {message}
              </p>
            </div>

            {/* Vídeo em tela cheia */}
            <video
              ref={handleVideoRef}
              autoPlay
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
              style={{ transform: "scaleX(-1)" }}
            />

            {/* Máscara oval de centralização */}
            <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
              <div
                className="md:w-[360px] md:h-[460px] w-[80%] h-[60%] shadow-[0_0_0_9999px_rgba(0,0,0,0.7)] border-4 border-dashed border-sky-400/60"
                style={{ borderRadius: "50% / 40%" }}
              />
            </div>

            <LivenessChallenge
              videoRef={videoRef}
              onComplete={handleFaceRegistered}
              onCancel={handleFaceRegisterCancel}
              onModelsLoaded={() => setMessage("Centralize seu rosto para o cadastro facial")}
              onStepChange={(msg) => setMessage(msg)}
            />

            {/* Botão de Cancelar no rodapé da câmera */}
            <div className="absolute bottom-6 left-0 right-0 z-[100] flex justify-center px-4 pointer-events-auto">
              <button
                onClick={handleFaceRegisterCancel}
                className="px-6 py-3 bg-slate-900/80 hover:bg-slate-900 border border-white/20 text-white rounded-full font-bold transition-all active:scale-95 text-sm cursor-pointer shadow-xl backdrop-blur-sm"
              >
                Cancelar
              </button>
            </div>

            {isRegistering && (
              <div className="absolute inset-0 z-[110] bg-sky-500/95 flex flex-col items-center justify-center">
                <Loader2 size={48} className="animate-spin text-white mb-4" />
                <h2 className="text-white text-2xl font-bold">Salvando Cadastro...</h2>
                <p className="text-sky-200 mt-2">{message}</p>
              </div>
            )}
          </div>
        )}

        {screen.name === "success" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
            <div className="bg-white rounded-2xl p-6 shadow-xl max-w-sm w-full">
              {screen.isOffline && screen.offlineRecord ? (
                <>
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                      <Radio size={24} className="animate-pulse" />
                    </div>
                    <div>
                      <h2 className="text-amber-600 text-lg font-bold">Ponto Registrado Offline!</h2>
                      <p className="text-xs text-slate-500">Gravado localmente no totem</p>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-4 my-3 border border-slate-200 space-y-2 text-xs">
                    {userName && (
                      <div className="flex justify-between py-1 border-b border-slate-200/60">
                        <span className="text-slate-500">Colaborador:</span>
                        <span className="font-bold text-slate-800">{userName}</span>
                      </div>
                    )}
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">Tipo de Ponto:</span>
                      <span className="font-bold text-slate-800">
                        {screen.offlineRecord.type === "ENTRY"
                          ? "Entrada"
                          : screen.offlineRecord.type === "LUNCH_START"
                          ? "Início Almoço"
                          : screen.offlineRecord.type === "LUNCH_END"
                          ? "Retorno Almoço"
                          : "Saída"}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">Horário Gravado:</span>
                      <span className="font-bold text-slate-800">
                        {new Date(screen.offlineRecord.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">Biometria:</span>
                      <span className="font-semibold text-emerald-600">Validada com Vivacidade ✅</span>
                    </div>
                  </div>

                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 my-2 text-xs text-amber-800 flex items-start gap-2">
                    <WifiOff size={16} className="shrink-0 mt-0.5 text-amber-500" />
                    <p className="leading-relaxed">
                      O comprovante fiscal definitivo com o número de registro (NSR) será gerado e disponibilizado para consulta assim que o totem restabelecer a conexão com a internet.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <span className="text-3xl">✅</span>
                    <h2 className="text-emerald-700 text-lg font-bold text-center">Ponto Registrado!</h2>
                  </div>
                  {screen.comprovante && (
                    <pre className="text-[10px] sm:text-xs text-slate-700 bg-slate-50 rounded-lg p-3 whitespace-pre-wrap font-mono leading-relaxed border border-slate-200 max-h-[280px] overflow-y-auto">
                      {screen.comprovante}
                    </pre>
                  )}
                </>
              )}
            </div>
            <button
              onClick={resetToIdle}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-8 py-4 rounded-2xl transition-all cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95"
            >
              {screen.isOffline ? "Entendido / Finalizar" : "Finalizar"}
            </button>
          </div>
        )}

        {screen.name === "exit" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-8 p-8">
            <div className="text-center space-y-2">
              <ShieldCheck className="w-14 h-14 text-emerald-400 mx-auto mb-3" />
              <h2 className="text-3xl font-bold">Sair do modo totem</h2>
              <p className="text-slate-400">
                {showRecover ? "Informe email e senha de um administrador" : "Digite o PIN de administrador para sair"}
              </p>
            </div>

            <div className="w-full max-w-2xl space-y-4">
              {!showRecover ? (
                <>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={exitPin}
                    onChange={(e) => setExitPin(e.target.value.replace(/\D/g, ""))}
                    placeholder="••••"
                    className="w-full px-4 py-4 rounded-xl bg-slate-900 border border-slate-700 focus:border-emerald-400 focus:outline-none text-center text-3xl tracking-[0.5em] font-bold placeholder:text-slate-600"
                  />

                  {error && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl p-3">
                      {error}
                    </div>
                  )}

                  <button
                    onClick={confirmExit}
                    disabled={isExiting || !exitPin}
                    className="w-full py-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isExiting ? (
                      <>
                        <Loader2 size={20} className="animate-spin" />
                        Saindo...
                      </>
                    ) : (
                      "Confirmar saída"
                    )}
                  </button>

                  <button
                    onClick={handleShowRecover}
                    className="w-full text-slate-400 hover:text-white transition-colors text-sm py-2"
                  >
                    Esqueceu seu PIN?
                  </button>
                </>
              ) : (
                <>
                  <input
                    type="email"
                    value={recoverEmail}
                    onChange={(e) => setRecoverEmail(e.target.value)}
                    placeholder="Email do administrador"
                    className="w-full px-4 py-4 rounded-xl bg-slate-900 border border-slate-700 focus:border-emerald-400 focus:outline-none text-lg placeholder:text-slate-600"
                  />

                  <input
                    type="password"
                    value={recoverPassword}
                    onChange={(e) => setRecoverPassword(e.target.value)}
                    placeholder="Senha"
                    className="w-full px-4 py-4 rounded-xl bg-slate-900 border border-slate-700 focus:border-emerald-400 focus:outline-none text-lg placeholder:text-slate-600"
                  />

                  {error && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl p-3">
                      {error}
                    </div>
                  )}

                  <button
                    onClick={handleRecover}
                    disabled={isRecovering || !recoverEmail.trim() || !recoverPassword}
                    className="w-full py-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isRecovering ? (
                      <>
                        <Loader2 size={20} className="animate-spin" />
                        Recuperando...
                      </>
                    ) : (
                      "Recuperar acesso"
                    )}
                  </button>

                  <button
                    onClick={handleBackToPin}
                    className="w-full text-slate-400 hover:text-white transition-colors text-sm py-2"
                  >
                    Voltar ao PIN
                  </button>
                </>
              )}

              <button
                onClick={resetToIdle}
                className="w-full text-slate-400 hover:text-white transition-colors text-sm py-2"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
