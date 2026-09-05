import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router";
import {
  LogIn,
  Utensils,
  Coffee,
  LogOut,
  MonitorSmartphone,
  ShieldCheck,
  ArrowLeft,
  Loader2,
  Camera,
  User,
  Radio,
  WifiOff,
  KeyRound,
  ScanFace,
  Mail,
  UserCheck,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { api, ApiError, isApiError, type TotemVerifyResponse } from "../../services/api";
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
  | { name: "recover-face" }
  | { name: "success"; comprovante?: string; isOffline?: boolean; offlineRecord?: OfflineCheckin }
  | { name: "exit" };

export function TotemPage() {
  const navigate = useNavigate();
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
  type ExitTab = "pin" | "face" | "email-code" | "credentials";
  const [exitTab, setExitTab] = useState<ExitTab>("pin");
  const [recoveryEmailMasked, setRecoveryEmailMasked] = useState<string | null>(null);
  const [recoveryCode, setRecoveryCode] = useState<string>("");
  const [isSendingCode, setIsSendingCode] = useState<boolean>(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState<boolean>(false);
  const [codeCountdown, setCodeCountdown] = useState<number>(0);
  const [isVerifyingAdminFace, setIsVerifyingAdminFace] = useState<boolean>(false);
  const [recoverEmail, setRecoverEmail] = useState("");
  const [recoverPassword, setRecoverPassword] = useState("");
  const [isRecovering, setIsRecovering] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const ativarModoKiosk = useCallback(() => {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
    if ("wakeLock" in navigator && !wakeLockRef.current) {
      navigator.wakeLock.request("screen").then((sentinel) => {
        wakeLockRef.current = sentinel;
      }).catch(() => {});
    }
  }, []);

  function encerrarSessaoTotem(mensagemSucesso?: string) {
    stopCamera();
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      wakeLockRef.current?.release().catch(() => {});
    } catch (err) {
      console.warn("Erro ao liberar recursos do terminal:", err);
    }
    localStorage.removeItem("@fragata:totem");
    localStorage.removeItem("@fragata:totem:expiresAt");
    toast.success(mensagemSucesso || "Modo totem encerrado com sucesso");
    navigate("/totem");
  }

  useEffect(() => {
    preloadFaceModels().catch((err) => {
      console.error("Erro ao pré-carregar modelos no Totem:", err);
    });
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("@fragata:totem");
    const expiresAt = localStorage.getItem("@fragata:totem:expiresAt");

    if (!token) {
      navigate("/totem");
      return;
    }

    if (expiresAt && Number(expiresAt) < Date.now()) {
      localStorage.removeItem("@fragata:totem");
      localStorage.removeItem("@fragata:totem:expiresAt");
      navigate("/totem");
      return;
    }
  }, [navigate]);

  useEffect(() => {
    const interval = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Bloqueio Kiosk Automático (Fullscreen, WakeLock, Atalhos e Navegação)
  useEffect(() => {
    ativarModoKiosk();
    const handlePrimeiroToque = () => ativarModoKiosk();
    window.addEventListener("click", handlePrimeiroToque, { once: true });
    window.addEventListener("touchstart", handlePrimeiroToque, { once: true });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "F12" ||
        e.key === "F5" ||
        (e.ctrlKey && ["r", "R", "w", "W", "u", "U"].includes(e.key)) ||
        (e.ctrlKey && e.shiftKey && ["i", "I", "j", "J"].includes(e.key))
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    window.addEventListener("contextmenu", handleContextMenu);

    window.history.pushState(null, "", window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, "", window.location.href);
    };
    window.addEventListener("popstate", handlePopState);

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("click", handlePrimeiroToque);
      window.removeEventListener("touchstart", handlePrimeiroToque);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      wakeLockRef.current?.release().catch(() => {});
    };
  }, [ativarModoKiosk]);

  useEffect(() => {
    if (codeCountdown <= 0) return;
    const timer = setTimeout(() => setCodeCountdown((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [codeCountdown]);

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

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
    setExitTab("pin");
    setRecoveryCode("");
    setIsSendingCode(false);
    setIsVerifyingCode(false);
    setRecoverEmail("");
    setRecoverPassword("");
    setIsRecovering(false);
  }

  async function startCamera(targetScreen: "camera" | "register-face" | "recover-face" = "camera") {
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
      if (targetScreen === "register-face") {
        setMessage("Centralize seu rosto para o cadastro");
        setScreen({ name: "register-face" });
      } else if (targetScreen === "recover-face") {
        setMessage("Aproxime o rosto para validação como Administrador");
        setScreen({ name: "recover-face" });
      } else {
        setMessage("Centralize seu rosto");
        setScreen({ name: "camera" });
      }
    } catch (err) {
      console.error("Erro ao acessar a webcam:", err);
      const msg = "Não foi possível acessar a câmera. Verifique as permissões do dispositivo.";
      setError(msg);
      toast.error(msg);
      if (targetScreen === "recover-face") {
        setScreen({ name: "exit" });
      } else {
        setScreen({ name: "select-type" });
      }
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

  const handleVideoRef = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el;
    if (el && streamRef.current && el.srcObject !== streamRef.current) {
      el.srcObject = streamRef.current;
      el.play().catch((err) => console.error("Erro ao reproduzir stream da câmera no Totem:", err));
    }
  }, []);

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

      // 1. Resposta real do servidor HTTP (ApiError)
      if (isApiError(err) || err instanceof ApiError) {
        const msg = err.message || "Erro ao registrar ponto. Tente novamente.";
        setError(msg);
        toast.error(msg, { duration: 6000 });
        setIsRegistering(false);
        resetToIdle();
        return;
      }

      // 2. Falha de rede nativa (sem resposta HTTP)
      const isFetchNetworkError =
        err instanceof TypeError ||
        (err instanceof Error &&
          (err.message.toLowerCase().includes("failed to fetch") ||
           err.message.toLowerCase().includes("networkerror") ||
           err.message.toLowerCase().includes("network request failed") ||
           err.message.toLowerCase().includes("load failed") ||
           err.message.toLowerCase().includes("net::err") ||
           err.message.toLowerCase().includes("conexão")));

      const isNetworkError = isFetchNetworkError;

      // Se o dispositivo indica que está online, faz verificação de recuperação:
      // se o ponto foi gravado no banco antes de eventual erro de gateway (ex: 502),
      // recupera o estado de sucesso sem registrar ponto offline duplicado
      if (navigator.onLine && userId && pendingType) {
        try {
          const checkinsHoje = await api.checkins.list();
          const existing = checkinsHoje.find(
            (c) =>
              c.type === pendingType &&
              Math.abs(new Date(c.createdAt).getTime() - Date.now()) < 3 * 60 * 1000
          );
          if (existing) {
            const existingComprovante =
              "comprovante" in existing && typeof (existing as { comprovante?: unknown }).comprovante === "string"
                ? (existing as { comprovante: string }).comprovante
                : undefined;
            setScreen({
              name: "success",
              comprovante: existingComprovante,
              isOffline: false,
            });
            setIsRegistering(false);
            toast.success("Ponto registrado com sucesso!");
            return;
          }
        } catch {
          // Servidor realmente inacessível
        }
      }

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
    setExitTab("pin");
    setError(null);
  }

  async function confirmExit() {
    setError(null);
    setIsExiting(true);
    try {
      await api.totem.deactivate(exitPin);
      encerrarSessaoTotem("Modo totem desativado com sucesso");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "PIN incorreto.";
      setError(msg);
      toast.error(msg);
      setIsExiting(false);
    }
  }

  async function handleSendRecoveryCode() {
    setError(null);
    setIsSendingCode(true);
    try {
      const res = await api.totem.sendRecoveryCode();
      setRecoveryEmailMasked(res.emailMasked);
      setCodeCountdown(60);
      toast.success(res.message);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao enviar código de recuperação.";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSendingCode(false);
    }
  }

  async function handleVerifyRecoveryCode() {
    if (recoveryCode.length !== 6) {
      setError("O código deve conter exatamente 6 dígitos.");
      return;
    }
    setError(null);
    setIsVerifyingCode(true);
    try {
      const res = await api.totem.verifyRecoveryCode(recoveryCode);
      encerrarSessaoTotem(res.message);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Código incorreto ou expirado.";
      setError(msg);
      toast.error(msg);
      setIsVerifyingCode(false);
    }
  }

  async function handleAdminFaceVerified(descriptor: Float32Array) {
    setIsVerifyingAdminFace(true);
    try {
      const res = await api.totem.recoverWithAdminFace(Array.from(descriptor));
      if (res.success) {
        stopCamera();
        encerrarSessaoTotem(res.message);
      } else {
        toast.error(res.message || "Rosto não reconhecido como administrador da empresa.");
        setIsVerifyingAdminFace(false);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao validar biometria de administrador.";
      toast.error(msg);
      setIsVerifyingAdminFace(false);
    }
  }

  function handleAdminFaceCancel() {
    stopCamera();
    setScreen({ name: "exit" });
    setExitTab("face");
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
      encerrarSessaoTotem("Acesso recuperado com sucesso");
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
          <div className="flex-1 flex flex-col items-center justify-center gap-8 p-6 md:p-8 max-w-5xl mx-auto w-full">
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

        {screen.name === "recover-face" && (
          <div className="fixed inset-0 w-full h-full bg-black z-50 overflow-hidden flex flex-col items-center justify-center">
            {/* Barra superior de instruções em roxo/índigo */}
            <div className="absolute top-0 left-0 right-0 z-[100] bg-indigo-600 w-full shadow-lg p-3 flex items-center justify-center">
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
                className="md:w-[360px] md:h-[460px] w-[80%] h-[60%] shadow-[0_0_0_9999px_rgba(0,0,0,0.7)] border-4 border-dashed border-indigo-400/60"
                style={{ borderRadius: "50% / 40%" }}
              />
            </div>

            <LivenessChallenge
              videoRef={videoRef}
              facialMode="FRONTAL_ONLY"
              onComplete={handleAdminFaceVerified}
              onCancel={handleAdminFaceCancel}
              onModelsLoaded={() => setMessage("Centralize seu rosto para autenticar como Administrador")}
              onStepChange={(msg) => setMessage(msg)}
            />

            {/* Botão de Cancelar no rodapé da câmera */}
            <div className="absolute bottom-6 left-0 right-0 z-[100] flex justify-center px-4 pointer-events-auto">
              <button
                onClick={handleAdminFaceCancel}
                className="px-6 py-3 bg-slate-900/80 hover:bg-slate-900 border border-white/20 text-white rounded-full font-bold transition-all active:scale-95 text-sm cursor-pointer shadow-xl backdrop-blur-sm"
              >
                Voltar à Tela de Saída
              </button>
            </div>

            {isVerifyingAdminFace && (
              <div className="absolute inset-0 z-[110] bg-indigo-600/95 flex flex-col items-center justify-center">
                <Loader2 size={48} className="animate-spin text-white mb-4" />
                <h2 className="text-white text-2xl font-bold">Autenticando Administrador...</h2>
                <p className="text-indigo-200 mt-2">Comparando biometria facial...</p>
              </div>
            )}
          </div>
        )}

        {screen.name === "success" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
            <div className="bg-white rounded-2xl p-6 shadow-xl max-w-5xl w-full">
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
                        {CHECKIN_OPTIONS.find((opt) => opt.type === screen.offlineRecord?.type)?.label ||
                          screen.offlineRecord?.type}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-200/60">
                      <span className="text-slate-500">Data e Hora:</span>
                      <span className="font-bold text-slate-800">
                        {new Date(screen.offlineRecord.timestamp).toLocaleString("pt-BR")}
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-500">Status:</span>
                      <span className="font-bold text-amber-600">Pendente de Sincronização</span>
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 flex items-start gap-2 text-xs text-amber-800">
                    <WifiOff size={16} className="text-amber-500 shrink-0 mt-0.5" />
                    <span>
                      O comprovante oficial com assinatura digital será gerado assim que o terminal restabelecer a conexão com a internet.
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <ShieldCheck className="text-emerald-500" size={32} />
                    <h2 className="text-emerald-500 text-xl font-bold">Ponto Registrado com Sucesso!</h2>
                  </div>

                  {screen.comprovante && (
                    <pre className="bg-slate-50 rounded-xl p-4 my-4 font-mono text-[11px] leading-relaxed border border-slate-200 overflow-x-auto text-slate-800 whitespace-pre">
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
          <div className="flex-1 flex flex-col items-center justify-center gap-6 p-4 sm:p-8 max-w-2xl mx-auto w-full">
            <div className="text-center space-y-2">
              <ShieldCheck className="w-14 h-14 text-emerald-400 mx-auto mb-2" />
              <h2 className="text-2xl sm:text-3xl font-bold">Sair do Modo Totem</h2>
              <p className="text-slate-400 text-sm">
                {exitTab === "pin" && "Digite o PIN de administrador para encerrar o terminal"}
                {exitTab === "face" && "Posicione o rosto na câmera para autenticar como Administrador"}
                {exitTab === "email-code" && "Informe o código de 6 dígitos enviado para seu e-mail"}
                {exitTab === "credentials" && "Informe e-mail e senha de um administrador da empresa"}
              </p>
            </div>

            {/* Abas de Navegação / Métodos de Saída */}
            <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-2 p-1.5 bg-slate-900/80 border border-slate-800 rounded-2xl">
              <button
                type="button"
                onClick={() => { setExitTab("pin"); setError(null); }}
                className={`py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  exitTab === "pin"
                    ? "bg-emerald-500 text-white shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                }`}
              >
                <KeyRound size={15} />
                PIN
              </button>

              <button
                type="button"
                onClick={() => { setExitTab("face"); setError(null); }}
                className={`py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  exitTab === "face"
                    ? "bg-emerald-500 text-white shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                }`}
              >
                <ScanFace size={15} />
                Facial
              </button>

              <button
                type="button"
                onClick={() => { setExitTab("email-code"); setError(null); }}
                className={`py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  exitTab === "email-code"
                    ? "bg-emerald-500 text-white shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                }`}
              >
                <Mail size={15} />
                Código
              </button>

              <button
                type="button"
                onClick={() => { setExitTab("credentials"); setError(null); }}
                className={`py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  exitTab === "credentials"
                    ? "bg-emerald-500 text-white shadow-sm"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                }`}
              >
                <UserCheck size={15} />
                Senha
              </button>
            </div>

            {/* Conteúdo de cada Aba */}
            <div className="w-full space-y-4">
              {/* 1. ABA PIN */}
              {exitTab === "pin" && (
                <div className="space-y-4">
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
                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl p-3 text-center">
                      {error}
                    </div>
                  )}

                  <button
                    onClick={confirmExit}
                    disabled={isExiting || !exitPin}
                    className="w-full py-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isExiting ? (
                      <>
                        <Loader2 size={20} className="animate-spin" />
                        Saindo...
                      </>
                    ) : (
                      "Confirmar Saída com PIN"
                    )}
                  </button>

                  <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-slate-400 pt-1">
                    <span>Esqueceu seu PIN?</span>
                    <button
                      type="button"
                      onClick={() => { setExitTab("face"); setError(null); }}
                      className="text-emerald-400 hover:underline cursor-pointer font-semibold"
                    >
                      Usar Reconhecimento Facial
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => { setExitTab("email-code"); setError(null); }}
                      className="text-emerald-400 hover:underline cursor-pointer font-semibold"
                    >
                      Receber código por e-mail
                    </button>
                  </div>
                </div>
              )}

              {/* 2. ABA FACIAL */}
              {exitTab === "face" && (
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 text-center space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mx-auto">
                    <ScanFace size={32} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-white">Validação Facial de Administrador</h3>
                    <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
                      Aproxime seu rosto da câmera. O sistema reconhecerá automaticamente qualquer administrador cadastrado da empresa para liberar o terminal.
                    </p>
                  </div>

                  {error && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl p-3 text-center">
                      {error}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => startCamera("recover-face")}
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/20"
                  >
                    <Camera size={20} />
                    Abrir Câmera e Escanear Rosto
                  </button>
                </div>
              )}

              {/* 3. ABA CÓDIGO POR E-MAIL */}
              {exitTab === "email-code" && (
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
                  {!recoveryEmailMasked ? (
                    <div className="text-center space-y-4">
                      <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                        <Mail size={32} />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-lg font-bold text-white">Código de Verificação por E-mail</h3>
                        <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
                          Enviaremos um código numérico de 6 dígitos para o e-mail cadastrado dos administradores desta empresa para confirmar a liberação.
                        </p>
                      </div>

                      {error && (
                        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl p-3 text-center">
                          {error}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={handleSendRecoveryCode}
                        disabled={isSendingCode}
                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-lg shadow-emerald-600/20"
                      >
                        {isSendingCode ? (
                          <>
                            <Loader2 size={20} className="animate-spin" />
                            Disparando e-mail...
                          </>
                        ) : (
                          <>
                            <Send size={18} />
                            Enviar Código para o E-mail
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="text-center space-y-1">
                        <p className="text-xs text-slate-400">Código de 6 dígitos enviado para:</p>
                        <p className="text-sm font-semibold text-emerald-400 font-mono">{recoveryEmailMasked}</p>
                      </div>

                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={recoveryCode}
                        onChange={(e) => setRecoveryCode(e.target.value.replace(/\D/g, ""))}
                        placeholder="000000"
                        className="w-full px-4 py-4 rounded-xl bg-slate-950 border border-slate-700 focus:border-emerald-400 focus:outline-none text-center text-3xl tracking-[0.5em] font-bold placeholder:text-slate-700 font-mono"
                      />

                      {error && (
                        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl p-3 text-center">
                          {error}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={handleVerifyRecoveryCode}
                        disabled={isVerifyingCode || recoveryCode.length !== 6}
                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/20"
                      >
                        {isVerifyingCode ? (
                          <>
                            <Loader2 size={20} className="animate-spin" />
                            Validando Código...
                          </>
                        ) : (
                          "Validar Código e Desativar Totem"
                        )}
                      </button>

                      <div className="text-center pt-2">
                        <button
                          type="button"
                          onClick={handleSendRecoveryCode}
                          disabled={isSendingCode || codeCountdown > 0}
                          className="text-xs text-slate-400 hover:text-emerald-400 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          {codeCountdown > 0
                            ? `Reenviar código em ${codeCountdown}s`
                            : "Não recebeu? Clique para reenviar"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 4. ABA CREDENCIAIS DE ADMIN */}
              {exitTab === "credentials" && (
                <div className="space-y-3">
                  <input
                    type="email"
                    value={recoverEmail}
                    onChange={(e) => setRecoverEmail(e.target.value)}
                    placeholder="E-mail do administrador"
                    className="w-full px-4 py-3.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-emerald-400 focus:outline-none text-base placeholder:text-slate-600"
                  />

                  <input
                    type="password"
                    value={recoverPassword}
                    onChange={(e) => setRecoverPassword(e.target.value)}
                    placeholder="Senha do administrador"
                    className="w-full px-4 py-3.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-emerald-400 focus:outline-none text-base placeholder:text-slate-600"
                  />

                  {error && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl p-3 text-center">
                      {error}
                    </div>
                  )}

                  <button
                    onClick={handleRecover}
                    disabled={isRecovering || !recoverEmail.trim() || !recoverPassword}
                    className="w-full py-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isRecovering ? (
                      <>
                        <Loader2 size={20} className="animate-spin" />
                        Autenticando...
                      </>
                    ) : (
                      "Confirmar com E-mail e Senha"
                    )}
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={resetToIdle}
                className="w-full text-slate-400 hover:text-white transition-colors text-sm py-2 cursor-pointer text-center"
              >
                Cancelar e Voltar ao Totem
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
