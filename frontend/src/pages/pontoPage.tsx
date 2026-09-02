import { useState, useEffect, useRef, useCallback } from "react"
import { useNavigate } from "react-router"
import { toast } from "sonner"

import { api } from "../services/api"
import { LivenessChallenge } from "../components/LivenessChallenge"
import { useAuth } from "../hooks/useAuth"
import { useCompany } from "../hooks/useCompany"

import { LogIn, Utensils, Coffee, LogOut, ScanFace, Copy, Check, Radio, WifiOff } from "lucide-react"
import { PontoPageSkeleton } from "../components/PontoPageSkeleton"
import { z } from "zod"
import { Button } from "../components/Button"
import { PageHeader } from "../components/common/PageHeader"
import type { CheckinCreateDto } from "../services/api"
import { preloadFaceModels, areFaceModelsLoaded } from "../utils/faceModels"
import { saveOfflineCheckin, getPendingOfflineCheckins, removeOfflineCheckin, type OfflineCheckin } from "../utils/offlineQueue"

type ChekinProps = {
    id: string,
    createdAt: string,
    type: "ENTRY" | "LUNCH_START" | "LUNCH_END" | "EXIT",
    latitude: number | null,
    longitude: number | null,
}

export function PontoPage() {
    const navigate = useNavigate();
    const { token, user } = useAuth();
    const { company } = useCompany();

    const [videoOpen, setVideoOpen] = useState<boolean>(false)
    const [message, setMessage] = useState<string>("Iniciando validação...")
    const [headerIsError, setHeaderIsError] = useState<boolean>(false)

    const [checkins, setCheckins] = useState<ChekinProps[]>([])
    const [isLoadingCheckins, setIsLoadingCheckins] = useState(true)
    const hasFaceRegistered = Boolean(user?.hasFaceDescriptor)

    const videoRef = useRef<HTMLVideoElement>(null)

    const [isSuccess, setIsSuccess] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);
    const [faceToken, setFaceToken] = useState<string | null>(null);
    const [showLiveness, setShowLiveness] = useState(false);
    const [isPreparingCheckin, setIsPreparingCheckin] = useState(false);
    const [comprovanteText, setComprovanteText] = useState<string | null>(null);
    const [copiedComprovante, setCopiedComprovante] = useState(false);
    const [offlineRecord, setOfflineRecord] = useState<OfflineCheckin | null>(null);
    const [isOfflineSuccess, setIsOfflineSuccess] = useState(false);
    const [pendingCheckin, setPendingCheckin] = useState<{
        type: string;
        latitude: number | null;
        longitude: number | null;
        accuracy?: number | null;
        geolocationDenied?: boolean;
        geolocationConsent?: boolean | null;
    } | null>(null);

    async function handlePostCheckin(type: string) {
        setIsPreparingCheckin(true);
        navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude, accuracy } = position.coords;

            const bodySchema = z.object({
                type: z.enum(["ENTRY", "LUNCH_START", "LUNCH_END", "EXIT"]),
                latitude: z.number().finite().min(-90).max(90),
                longitude: z.number().finite().min(-180).max(180),
                accuracy: z.number().finite().min(0).max(100000).optional(),
            })

            try {
                bodySchema.parse({ type, latitude, longitude, accuracy })

                setPendingCheckin({ type, latitude, longitude, accuracy, geolocationDenied: false, geolocationConsent: true });

                const verifyFacial = await handleGetEmployee()
                if (verifyFacial?.success !== true) {
                    setPendingCheckin(null);
                    setIsPreparingCheckin(false);
                    return
                }
                setIsPreparingCheckin(false);
            } catch (error) {
                if (error instanceof z.ZodError) {
                    console.error("Erro de validação:", error.issues);
                } else {
                    console.error("Erro ao preparar check-in:", error);
                    alert(error instanceof Error ? error.message : "Erro ao preparar check-in. Tente novamente.");
                }
                setPendingCheckin(null);
                setIsPreparingCheckin(false);
            }
        }, async (error) => {
            console.error("Erro ao obter localização:", error);
            // A4: CLT não permite negar registro — flag para admin analisar depois
            const isDenied = error.code === 1; // PERMISSION_DENIED
            setPendingCheckin({
                type,
                latitude: null,
                longitude: null,
                accuracy: null,
                geolocationDenied: true,
                geolocationConsent: false,
            });
            // prossegue para validação facial mesmo sem GPS
            try {
                const verifyFacial = await handleGetEmployee()
                if (verifyFacial?.success !== true) {
                    setPendingCheckin(null);
                }
            } catch (e) {
                console.error("Erro após GPS negado:", e);
                setPendingCheckin(null);
            } finally {
                setIsPreparingCheckin(false);
            }
            if (isDenied) {
                console.warn("Ponto será registrado sem localização e ficará pendente de justificativa para o admin.");
            }
        }, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        });
    }

    async function handleRetryFaceToken(): Promise<string | null> {
        try {
            if (!token) {
                stopCamera();
                setVideoOpen(false);
                setPendingCheckin(null);
                navigate("/");
                return null;
            }
            const data = await api.employees.issueFaceToken();
            setFaceToken(data.token);
            setHeaderIsError(false);
            return data.token;
        } catch (err) {
            console.error("Erro ao renovar token facial:", err);
            return null;
        }
    }

    async function handleGetEmployee() {
        try {
            if (!token) {
                stopCamera();
                setVideoOpen(false);
                setPendingCheckin(null);
                navigate("/");
                return { success: false };
            }

            if (!user?.hasFaceDescriptor) {
                setPendingCheckin(null);
                alert("Registro facial pendente. Por favor, cadastre sua face antes de bater o ponto.");
                navigate("/register");
                return { success: false };
            }

            let data;
            try {
                data = await api.employees.issueFaceToken();
            } catch (err: unknown) {
                console.error("Erro ao emitir token facial:", err);
                stopCamera();
                setVideoOpen(false);
                setPendingCheckin(null);
                const errorObj = err as { code?: string; message?: string };
                if (errorObj?.code === "FACE_NOT_REGISTERED") {
                    navigate("/register");
                } else {
                    alert(errorObj?.message || "Erro ao iniciar validação facial. Tente novamente.");
                }
                return { success: false };
            }

            setFaceToken(data.token);

            // Garante que os modelos de IA estejam 100% carregados antes de abrir a câmera
            if (!areFaceModelsLoaded()) {
                await preloadFaceModels();
            }

            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: { ideal: 640 },
                        height: { ideal: 480 },
                        facingMode: "user"
                    }
                });

                setVideoOpen(true);
                setShowLiveness(true);
                setHeaderIsError(false);
                setMessage("Centralize seu rosto");

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;

                    await new Promise((resolve) => {
                        if (videoRef.current) {
                            videoRef.current.onloadedmetadata = () => {
                                videoRef.current?.play();
                                resolve(true);
                            };
                        }
                    });
                }
            } catch (err) {
                console.error("Erro ao acessar a webcam:", err);
                stopCamera();
                setVideoOpen(false);
                setPendingCheckin(null);
                alert("Não foi possível acessar a câmera. Verifique as permissões do navegador.");
                return { success: false };
            }

            return { success: true };

        } catch {
            stopCamera();
            setVideoOpen(false);
            setPendingCheckin(null);
            return { success: false };
        }
    }

    function stopCamera() {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach((track) => track.stop());
            videoRef.current.srcObject = null;
        }
    }

    async function handleLivenessComplete() {
        if (!pendingCheckin) {
            setShowLiveness(false);
            setIsRegistering(false);
            stopCamera();
            setVideoOpen(false);
            return;
        }

        stopCamera();
        setShowLiveness(false);
        setIsRegistering(true);
        setHeaderIsError(false);
        setMessage("Registrando ponto...");

        try {
            if (!token) {
                setIsRegistering(false);
                setVideoOpen(false);
                navigate("/");
                return;
            }

            const response = await api.checkins.create(pendingCheckin as CheckinCreateDto);

            // Desativa o spinner de registro para que o modal de sucesso com comprovante fique visível
            setIsRegistering(false);
            setComprovanteText(response.comprovante);
            setIsSuccess(true);
            setMessage("Ponto registrado com sucesso!");
            setPendingCheckin(null);
            setFaceToken(null);

            // Atualização otimista e imediata para que os botões reflitam "Ponto Registrado" sem delay
            if (response.checkin?.checkin) {
                const newCheckin = response.checkin.checkin as ChekinProps;
                setCheckins((prev) => {
                    const filtered = prev.filter((c) => c.type !== newCheckin.type);
                    return [...filtered, newCheckin];
                });
            }

            // Sincroniza estado com o backend
            await handleGetCheckin();
        } catch (error) {
            console.error("Erro ao registrar o ponto:", error);

            // Detecção de falha de conexão ou rede indisponível
            const isNetworkError =
                !navigator.onLine ||
                (error instanceof Error &&
                    (error.message.includes("fetch") ||
                     error.message.includes("Network") ||
                     error.message.includes("Failed") ||
                     error.message.includes("conexão")));

            if (isNetworkError && user?.id && pendingCheckin?.type) {
                try {
                    const offlineItem = await saveOfflineCheckin({
                        userId: user.id,
                        userName: user.name,
                        type: pendingCheckin.type as "ENTRY" | "LUNCH_START" | "LUNCH_END" | "EXIT",
                        latitude: pendingCheckin.latitude,
                        longitude: pendingCheckin.longitude,
                        accuracy: pendingCheckin.accuracy,
                    });

                    // Mensagem flutuante no padrão de boas-vindas do login
                    toast.info("Ponto registrado offline!", {
                        description: "Sua marcação foi salva com segurança no aparelho e será sincronizada automaticamente assim que a conexão retornar.",
                        duration: 6000,
                    });

                    setIsRegistering(false);
                    setOfflineRecord(offlineItem);
                    setIsOfflineSuccess(true);
                    setIsSuccess(true);
                    setPendingCheckin(null);
                    setFaceToken(null);
                    return;
                } catch (offlineErr) {
                    console.error("Falha ao gravar contingência offline:", offlineErr);
                }
            }

            setIsRegistering(false);
            setVideoOpen(false);
            setPendingCheckin(null);
            setFaceToken(null);
            setComprovanteText(null);
            const errorMsg = error instanceof Error ? error.message : "Erro ao registrar o ponto. Tente novamente.";
            setMessage(errorMsg);
            toast.error(errorMsg);
        }
    }

    const handleLivenessCancel = () => {
        stopCamera();
        setShowLiveness(false);
        setVideoOpen(false);
        setPendingCheckin(null);
        setFaceToken(null);
        setHeaderIsError(false);
        setMessage("Validação cancelada");
    };

    const handleGetCheckin = useCallback(async () => {
        setIsLoadingCheckins(true);

        try {
            if (!token) {
                navigate("/");
                return;
            }

            const data = await api.checkins.list();
            setCheckins(data);

        } catch (error) {
            console.error("Erro ao buscar os pontos:", error);
            if (navigator.onLine) {
                toast.error(error instanceof Error ? error.message : "Erro ao buscar os pontos. Tente novamente.");
            }
        } finally {
            setIsLoadingCheckins(false);
        }
    }, [navigate, token]);

    const handleGetCheckinRef = useRef(handleGetCheckin);
    useEffect(() => {
        handleGetCheckinRef.current = handleGetCheckin;
    }, [handleGetCheckin]);

    useEffect(() => {
        // Pré-carrega os modelos em background assim que a página é acessada
        preloadFaceModels().catch((err) => {
            console.error("Erro ao pré-carregar modelos face-api no PontoPage:", err);
        });
        handleGetCheckin();

        const syncPendingOffline = async () => {
            if (!user?.id || !token || !navigator.onLine) return;
            try {
                const pending = await getPendingOfflineCheckins(user.id);
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

                toast.success("Marcações sincronizadas!", {
                    description: `${result.synced.length} ponto(s) gravados offline foram sincronizados com sucesso no servidor.`,
                });
                handleGetCheckinRef.current();
            } catch (err) {
                console.warn("Tentativa de sincronização offline postergada:", err);
            }
        };

        syncPendingOffline();

        const handleOnline = () => {
            syncPendingOffline();
        };

        window.addEventListener("online", handleOnline);
        return () => window.removeEventListener("online", handleOnline);
    }, [handleGetCheckin, user?.id, token]);

    useEffect(() => {
        if (videoOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [videoOpen]);

    return (
        <div className="w-full font-sans antialiased text-slate-900 dark:text-slate-100">
            {videoOpen && (
                <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-black/95 backdrop-blur-md animate-in fade-in duration-300">
                    {/* CORREÇÃO 1: h-auto removido no mobile e flex col items-center para garantir alinhamento */}
                    <div className="relative w-full max-w-2xl bg-slate-900 sm:rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col justify-center items-center h-[80vh] max-h-[700px]">

                        {/* MENSAGEM NO TOPO DO VÍDEO */}
                        <div className={`absolute top-0 left-0 right-0 z-[100] ${headerIsError ? 'bg-red-500' : 'bg-emerald-400'} w-full shadow-lg p-3 h-[60px] flex items-center justify-center transition-colors duration-300`}>
                            <p className="text-white text-sm md:text-lg font-bold text-center uppercase tracking-wider">
                                {message}
                            </p>
                        </div>

                        {/* O VÍDEO (CORREÇÃO 2: w-full h-full object-cover para preencher o bloco inteiro centralizado) */}
                        <video
                            ref={videoRef}
                            autoPlay
                            muted
                            playsInline
                            className="w-full h-full object-cover"
                            style={{ transform: 'scaleX(-1)' }}
                        />

                        {/* MÁSCARA OVAL EMERALD */}
                        <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
                            <div
                                className={`md:w-[360px] md:h-[460px] w-[80%] h-[60%] shadow-[0_0_0_9999px_rgba(0,0,0,0.7)] border-4 border-dashed ${headerIsError ? 'border-red-500/80' : 'border-emerald-400/60'} transition-colors duration-300`}
                                style={{ borderRadius: '50% / 40%' }}
                            />
                        </div>

                        {showLiveness && faceToken && (
                            <LivenessChallenge
                                videoRef={videoRef}
                                faceToken={faceToken}
                                facialMode={company?.settings?.ponto?.facialMode || 'FRONTAL_ONLY'}
                                onComplete={handleLivenessComplete}
                                onCancel={handleLivenessCancel}
                                onRetry={handleRetryFaceToken}
                                onModelsLoaded={() => {
                                    setHeaderIsError(false);
                                    setMessage("Centralize seu rosto");
                                }}
                                onStepChange={(msg) => {
                                    setMessage(msg);
                                    setHeaderIsError(
                                        msg.toLowerCase().includes('não compatível') ||
                                        msg.toLowerCase().includes('não reconhecido') ||
                                        msg.toLowerCase().includes('expirada') ||
                                        msg.toLowerCase().includes('erro')
                                    );
                                }}
                            />
                        )}

                        {isRegistering && (
                            <div className="absolute inset-0 z-[110] bg-emerald-500/95 flex flex-col items-center justify-center animate-in zoom-in duration-300">
                                <div className="relative mb-6">
                                    <div className="w-24 h-24 border-4 border-white/30 rounded-full"></div>
                                    <div className="absolute inset-0 border-4 border-emerald-300 rounded-full animate-spin border-t-transparent" />
                                </div>
                                <h2 className="text-white text-2xl font-bold">Registrando Ponto...</h2>
                                <p className="text-emerald-200 mt-2">{message}</p>
                                <div className="w-48 h-1 bg-white/20 rounded-full mt-6 overflow-hidden">
                                    <div className="h-full bg-emerald-300 rounded-full animate-progress" style={{ width: '60%' }} />
                                </div>
                            </div>
                        )}

                        {!showLiveness && !isSuccess && !isRegistering && (
                            <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center">
                                <div className="relative md:w-[360px] md:h-[460px] w-[80%] h-[60%] border-2 border-emerald-500 rounded-[50%/40%] overflow-hidden">
                                    {/* Linha de Scanner Animada */}
                                    <div className="w-full h-1 bg-emerald-500 shadow-[0_0_15px_#34d399] absolute top-0 animate-[scan_2s_linear_infinite]" />
                                </div>
                            </div>
                        )}

                        {isSuccess && (
                            <div className="absolute inset-0 z-[120] bg-emerald-600/95 backdrop-blur-sm flex flex-col justify-center animate-in zoom-in duration-300 p-4 sm:p-6 overflow-y-auto">
                                <div className="bg-white dark:bg-[#111113] rounded-3xl p-5 md:p-6 shadow-2xl w-full max-w-lg sm:max-w-xl mx-auto border border-slate-200 dark:border-white/10 flex flex-col max-h-[85vh] sm:max-h-[90vh]">
                                    {isOfflineSuccess && offlineRecord ? (
                                        <>
                                            <div className="flex items-center justify-center gap-3 mb-3">
                                                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                                                    <Radio size={24} className="animate-pulse" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h2 className="text-amber-600 dark:text-amber-400 text-lg font-bold">Ponto Registrado Offline!</h2>
                                                    </div>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">Gravado localmente com integridade SHA-256</p>
                                                </div>
                                            </div>

                                            <div className="bg-slate-50 dark:bg-black/40 rounded-2xl p-4 my-2 border border-slate-200 dark:border-white/10 space-y-2 text-xs">
                                                <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-white/5">
                                                    <span className="text-slate-500">Tipo de Marcação:</span>
                                                    <span className="font-bold text-slate-800 dark:text-slate-200">
                                                        {offlineRecord.type === "ENTRY" ? "Entrada" : offlineRecord.type === "LUNCH_START" ? "Início Almoço" : offlineRecord.type === "LUNCH_END" ? "Retorno Almoço" : "Saída"}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-white/5">
                                                    <span className="text-slate-500">Horário Gravado:</span>
                                                    <span className="font-bold text-slate-800 dark:text-slate-200">
                                                        {new Date(offlineRecord.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between py-1 border-b border-slate-200/60 dark:border-white/5">
                                                    <span className="text-slate-500">Biometria Facial:</span>
                                                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">Validada com Vivacidade ✅</span>
                                                </div>
                                                {offlineRecord.latitude != null && (
                                                    <div className="flex justify-between py-1">
                                                        <span className="text-slate-500">Geolocalização:</span>
                                                        <span className="text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                                                            {offlineRecord.latitude.toFixed(4)}, {offlineRecord.longitude?.toFixed(4)}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 my-2 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
                                                <WifiOff size={16} className="shrink-0 mt-0.5 text-amber-500" />
                                                <p className="leading-relaxed">
                                                    O comprovante fiscal definitivo com o número de registro (NSR) será gerado e ficará disponível para consulta e download assim que a conexão com a internet retornar.
                                                </p>
                                            </div>

                                            <div className="mt-3 pt-2 border-t border-slate-100 dark:border-white/10">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setVideoOpen(false);
                                                        setIsSuccess(false);
                                                        setIsOfflineSuccess(false);
                                                        setOfflineRecord(null);
                                                    }}
                                                    className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-900/20 active:scale-95 cursor-pointer uppercase tracking-wider text-center"
                                                >
                                                    Entendido / Concluir
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="flex items-center justify-center gap-3 mb-3">
                                                <span className="text-3xl">✅</span>
                                                <div>
                                                    <h2 className="text-emerald-700 dark:text-emerald-400 text-lg font-bold">Ponto Registrado com Sucesso!</h2>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">Comprovante emitido (Portaria 671/MTP)</p>
                                                </div>
                                            </div>
                                            {comprovanteText && (
                                                <div className="relative flex-1 min-h-0 my-2 w-full">
                                                    <pre className="w-full text-[10px] sm:text-xs text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-black/40 rounded-xl p-3 sm:p-4 whitespace-pre-wrap break-all font-mono leading-relaxed border border-slate-200 dark:border-white/10 max-h-[300px] overflow-y-auto select-all">
                                                        {comprovanteText}
                                                    </pre>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-3 mt-4 pt-2 border-t border-slate-100 dark:border-white/10">
                                                {comprovanteText && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(comprovanteText);
                                                            setCopiedComprovante(true);
                                                            setTimeout(() => setCopiedComprovante(false), 2000);
                                                        }}
                                                        className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 text-xs font-semibold transition-all cursor-pointer"
                                                    >
                                                        {copiedComprovante ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                                                        <span>{copiedComprovante ? "Copiado!" : "Copiar Comprovante"}</span>
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setVideoOpen(false);
                                                        setIsSuccess(false);
                                                        setComprovanteText(null);
                                                        setCopiedComprovante(false);
                                                    }}
                                                    className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-900/20 active:scale-95 cursor-pointer uppercase tracking-wider text-center"
                                                >
                                                    Concluir
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        {!showLiveness && !isSuccess && (
                            <div className="absolute bottom-8 left-0 right-0 z-20 flex justify-center px-4">
                                <button
                                    onClick={() => setVideoOpen(false)}
                                    className="w-full max-w-[200px] py-3 bg-emerald-400 text-white rounded-full font-bold hover:bg-emerald-500 transition-all active:scale-95 shadow-lg shadow-emerald-900/40 cursor-pointer uppercase text-xs tracking-widest"
                                >
                                    Cancelar
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* CONTEÚDO PRINCIPAL */}
            <div className="w-full space-y-6">
                <PageHeader
                    title="Bater Ponto"
                    subtitle="Registro biométrico facial com validação de vivacidade e GPS"
                    helpText="Posicione seu rosto dentro da moldura oval para registrar entrada, saída ou intervalo com biometria facial e geolocalização."
                />

                {isLoadingCheckins ? (
                    <PontoPageSkeleton />
                ) : hasFaceRegistered ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 md:gap-6">
                        {[
                            { label: "Entrada", type: "ENTRY", icon: <LogIn className="text-emerald-500" size={32} /> },
                            { label: "Início Almoço", type: "LUNCH_START", icon: <Utensils className="text-emerald-500" size={32} /> },
                            { label: "Retorno Almoço", type: "LUNCH_END", icon: <Coffee className="text-emerald-500" size={32} /> },
                            { label: "Saída", type: "EXIT", icon: <LogOut className="text-red-500" size={32} /> },
                        ].map((item) => {
                            const existingCheckin = checkins.find((checkin) => checkin.type === item.type);
                            const hasRegistered = !!existingCheckin;

                            // Se existir o check-in, podemos até pegar o horário dele para mostrar na tela se quiser!
                            const checkinTime = existingCheckin
                                ? new Date(existingCheckin.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                : null;

                            return (
                                <section
                                    key={item.type}
                                    className={`group relative bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-3xl p-6 md:p-8 flex flex-col items-center gap-6 transition-all hover:shadow-xl hover:shadow-emerald-900/5 shadow-sm ${hasRegistered ? "hover:border-gray-400 dark:hover:border-slate-600" : "hover:border-emerald-400 dark:hover:border-emerald-500/40"}`}
                                >
                                    <div className="text-4xl">{item.icon}</div>
                                    <div className="text-center">
                                        <h3 className="text-xl font-bold text-slate-800 dark:text-white">{item.label}</h3>
                                        <p className="text-emerald-600 dark:text-emerald-400 text-xs mt-1 font-medium">
                                            {hasRegistered ? `Registrado às ${checkinTime}` : "Requer validação facial"}
                                        </p>
                                    </div>

                                    <Button
                                        title={hasRegistered ? "Ponto Registrado" : isPreparingCheckin ? "Preparando..." : "Registrar Ponto"}
                                        disabled={hasRegistered || isPreparingCheckin}
                                        onClick={() => handlePostCheckin(item.type)}
                                        className={`w-full bg-emerald-600 dark:bg-emerald-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-100 dark:shadow-none transition-all active:scale-95 disabled:grayscale ${hasRegistered ? "opacity-70 cursor-not-allowed" : isPreparingCheckin ? "opacity-70 cursor-wait" : "cursor-pointer hover:bg-emerald-700 dark:hover:bg-emerald-600"}`}
                                    />
                                </section>
                            );
                        })}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 md:gap-6">
                        <section className="group relative bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-3xl p-6 md:p-8 flex flex-col items-center gap-6 transition-all hover:shadow-xl hover:shadow-emerald-900/5 shadow-sm hover:border-emerald-400 dark:hover:border-emerald-500/40">
                            <ScanFace className="text-emerald-600 dark:text-emerald-400" size={48} />
                            <div className="text-center">
                                <h3 className="text-xl font-bold text-slate-800 dark:text-white">Registro Facial Pendente</h3>
                                <p className="text-emerald-600 dark:text-emerald-400 text-xs mt-1 font-medium">
                                    Cadastre sua facial para registrar pontos
                                </p>
                            </div>

                            <Button
                                title="Cadastrar Facial"
                                onClick={() => window.location.href = "/register"}
                                className="w-full bg-emerald-600 text-white font-bold py-4 rounded-2xl shadow-md shadow-emerald-400 transition-all active:scale-95 cursor-pointer hover:bg-emerald-700 hover:shadow-emerald-600"
                            />
                        </section>
                    </div>
                )}
            </div>
        </div>
    );
}