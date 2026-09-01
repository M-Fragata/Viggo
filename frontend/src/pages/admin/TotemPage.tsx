import { useEffect, useRef, useState } from "react";
import { LogIn, Utensils, Coffee, LogOut, MonitorSmartphone, ShieldCheck, ArrowLeft, Loader2, Camera } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError, type TotemVerifyResponse } from "../../services/api";
import { LivenessChallenge } from "../../components/LivenessChallenge";
import { preloadFaceModels } from "../../utils/faceModels";

type CheckinType = "ENTRY" | "LUNCH_START" | "LUNCH_END" | "EXIT";

const CHECKIN_OPTIONS: { label: string; type: CheckinType; icon: React.ReactNode }[] = [
  { label: "Entrada", type: "ENTRY", icon: <LogIn className="text-emerald-500" size={32} /> },
  { label: "Início Almoço", type: "LUNCH_START", icon: <Utensils className="text-emerald-500" size={32} /> },
  { label: "Retorno Almoço", type: "LUNCH_END", icon: <Coffee className="text-emerald-500" size={32} /> },
  { label: "Saída", type: "EXIT", icon: <LogOut className="text-red-500" size={32} /> },
];

type Screen =
  | { name: "idle" }
  | { name: "select-type" }
  | { name: "login"; type: CheckinType }
  | { name: "camera" }
  | { name: "register-face" }
  | { name: "success"; comprovante: string }
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
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
      });

      streamRef.current = stream;
      setMessage("Iniciando validação...");
      if (targetScreen === "register-face") {
        setScreen({ name: "register-face" });
      } else {
        setScreen({ name: "camera" });
      }
    } catch (err) {
      console.error("Erro ao acessar a webcam:", err);
      setError("Não foi possível acessar a câmera. Verifique as permissões do dispositivo.");
      setScreen({ name: "login", type: pendingType ?? "ENTRY" });
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
      if (data.totemAuthMode) {
        setTotemAuthMode(data.totemAuthMode);
      }
      setIsVerifying(false);

      if (data.totemAuthMode === "CREDENTIALS_ONLY") {
        setIsRegistering(true);
        setMessage("Registrando ponto...");
        let coords = pendingCoords;
        if (!coords) {
          try {
            coords = await getLocation();
            setPendingCoords(coords);
          } catch {
            coords = { latitude: 0, longitude: 0 };
          }
        }
        const response = await api.totem.checkin({
          userId: data.userId,
          type: pendingType ?? "ENTRY",
          latitude: coords.latitude,
          longitude: coords.longitude,
          faceToken: data.faceToken,
        });
        toast.success("Ponto registrado com sucesso!");
        setScreen({ name: "success", comprovante: response.comprovante });
        setIsRegistering(false);
        return;
      }

      await startCamera();
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
      setScreen({ name: "login", type: pendingType ?? "ENTRY" });
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
    await startCamera("register-face");
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
      setScreen({ name: "login", type: pendingType ?? "ENTRY" });
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
      const msg = err instanceof Error ? err.message : "Erro ao registrar ponto. Tente novamente.";
      setError(msg);
      toast.error(msg, { duration: 6000 });
      setIsRegistering(false);
      resetToIdle();
    }
  }

  function handleFaceCancel() {
    stopCamera();
    toast.info("Validação facial cancelada");
    setError("Validação cancelada");
    setScreen({ name: "login", type: pendingType ?? "ENTRY" });
  }

  function handleFaceRegisterCancel() {
    stopCamera();
    toast.info("Cadastro facial cancelado");
    setError("Cadastro facial cancelado");
    setScreen({ name: "login", type: pendingType ?? "ENTRY" });
  }

  function handleSelectType(type: CheckinType) {
    setPendingType(type);
    setScreen({ name: "login", type });
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
    setScreen({ name: "select-type" });
  }

  async function handlePickType(type: CheckinType) {
    setIsVerifying(true);
    setError(null);
    try {
      const coords = await getLocation();
      setPendingCoords(coords);
      handleSelectType(type);
    } catch (err) {
      console.error("Erro ao obter localização:", err);
      setError("Erro ao obter localização. Permita o acesso e tente novamente.");
    } finally {
      setIsVerifying(false);
    }
  }

  const time = clock.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const date = clock.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col overflow-hidden">
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
              className="flex items-center gap-2 text-slate-500 hover:text-slate-300 transition-colors text-sm"
            >
              <ShieldCheck size={16} />
              Sair do modo totem (administrador)
            </button>
          </div>
        )}

        {screen.name === "select-type" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-8 p-8">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold">Selecione o tipo de marcação</h2>
              <p className="text-slate-400">Identifique-se após escolher o tipo</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-4xl h-full">
              {CHECKIN_OPTIONS.map((option) => (
                <button
                  key={option.type}
                  onClick={() => handlePickType(option.type)}
                  disabled={isVerifying}
                  className="bg-slate-900 border border-slate-700 hover:border-emerald-400 rounded-2xl p-6 flex flex-col items-center gap-4 transition-all hover:scale-[1.02] disabled:opacity-60"
                >
                  {option.icon}
                  <span className="text-lg font-bold">{option.label}</span>
                </button>
              ))}
            </div>

            <button
              onClick={() => setScreen({ name: "idle" })}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={18} />
              Voltar
            </button>
          </div>
        )}

        {screen.name === "login" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-8 p-8">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold">
                Identificação do funcionário
              </h2>
              <p className="text-slate-400">
                {CHECKIN_OPTIONS.find((o) => o.type === screen.type)?.label} · {userName ?? "Informe email e senha"}
              </p>
            </div>

            <div className="w-full max-w-5xl space-y-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email do funcionário"
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
                  className="w-full py-4 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Camera size={20} />
                  Cadastrar Facial
                </button>
              )}

              <button
                onClick={handleVerify}
                disabled={isVerifying || !email || !password}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isVerifying ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Verificando...
                  </>
                ) : (
                  "Verificar e continuar"
                )}
              </button>

              <button
                onClick={resetToIdle}
                className="w-full text-slate-400 hover:text-white transition-colors text-sm py-2 flex items-center justify-center gap-2"
              >
                <ArrowLeft size={16} />
                Cancelar
              </button>
            </div>
          </div>
        )}

        {screen.name === "camera" && (
          <div className="relative flex-1 bg-black">
            <div className="absolute top-0 left-0 right-0 z-[100] bg-emerald-500 w-full shadow-lg p-3 flex items-center justify-center">
              <p className="text-white text-sm md:text-lg font-bold text-center uppercase tracking-wider">
                {message}
              </p>
            </div>

            <video
              ref={handleVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
              style={{ transform: "scaleX(-1)" }}
            />

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
              <div className="relative flex-1 bg-black">
                <div className="absolute top-0 left-0 right-0 z-[100] bg-sky-500 w-full shadow-lg p-3 flex items-center justify-center">
                  <p className="text-white text-sm md:text-lg font-bold text-center uppercase tracking-wider">
                    {message}
                  </p>
                </div>

                <video
                  ref={handleVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                  style={{ transform: "scaleX(-1)" }}
                />

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
              <div className="flex items-center justify-center gap-2 mb-4">
                <span className="text-3xl">✅</span>
                <h2 className="text-emerald-700 text-lg font-bold text-center">Ponto Registrado!</h2>
              </div>
              <pre className="text-[10px] sm:text-xs text-slate-700 bg-slate-50 rounded-lg p-3 whitespace-pre-wrap font-mono leading-relaxed border border-slate-200 max-h-[280px] overflow-y-auto">
                {screen.comprovante}
              </pre>
            </div>
            <button
              onClick={resetToIdle}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-8 py-4 rounded-2xl transition-all"
            >
              Finalizar
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
