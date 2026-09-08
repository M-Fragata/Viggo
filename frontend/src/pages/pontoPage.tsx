import { useState, useEffect, useRef, useCallback } from "react"
import { useNavigate } from "react-router"
import { toast } from "sonner"

import { api, ApiError, isApiError } from "../services/api"
import { LivenessChallenge } from "../components/LivenessChallenge"
import { useAuth } from "../hooks/useAuth"
import { useCompany } from "../hooks/useCompany"

import { LogIn, Utensils, Coffee, LogOut, ScanFace, MapPinOff, Navigation, X, Download, Loader2 } from "lucide-react"
import { PontoPageSkeleton } from "../components/PontoPageSkeleton"
import { z } from "zod"
import { Button } from "../components/Button"
import { PageHeader } from "../components/common/PageHeader"
import type { CheckinCreateDto, ComprovanteDados } from "../services/api"
import { ComprovanteTicket } from "../components/ComprovanteTicket"
import { preloadFaceModels, areFaceModelsLoaded } from "../utils/faceModels"
import { saveOfflineCheckin, getPendingOfflineCheckins, removeOfflineCheckin } from "../utils/offlineQueue"

type ChekinProps = {
    id: string,
    createdAt: string,
    type: "ENTRY" | "LUNCH_START" | "LUNCH_END" | "EXIT",
    latitude: number | null,
    longitude: number | null,
    comprovante?: string,
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

    const videoRef = useRef<HTMLVideoElement | null>(null)
    const streamRef = useRef<MediaStream | null>(null)

    const handleVideoRef = useCallback((el: HTMLVideoElement | null) => {
        videoRef.current = el;
        if (el && streamRef.current && el.srcObject !== streamRef.current) {
            el.srcObject = streamRef.current;
            el.play().catch((err) => console.error("Erro ao reproduzir stream da webcam:", err));
        }
    }, []);

    const [isSuccess, setIsSuccess] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);
    const [faceToken, setFaceToken] = useState<string | null>(null);
    const [showLiveness, setShowLiveness] = useState(false);
    const [isPreparingCheckin, setIsPreparingCheckin] = useState(false);
    const [comprovanteText, setComprovanteText] = useState<string | null>(null);
    const [comprovanteDados, setComprovanteDados] = useState<ComprovanteDados | null>(null);
    const [lastCheckinId, setLastCheckinId] = useState<string | null>(null);
    const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
    const [isOfflineSuccess, setIsOfflineSuccess] = useState(false);
    const [pendingCheckin, setPendingCheckin] = useState<{
        type: string;
        latitude: number | null;
        longitude: number | null;
        accuracy?: number | null;
        geolocationDenied?: boolean;
        geolocationConsent?: boolean | null;
    } | null>(null);
    const [geoPrompt, setGeoPrompt] = useState<{
        open: boolean;
        type: string;
        reason?: string;
        isDenied?: boolean;
    } | null>(null);

    async function startFacialCheckin(checkinData: {
        type: string;
        latitude: number | null;
        longitude: number | null;
        accuracy?: number | null;
        geolocationDenied: boolean;
        geolocationConsent: boolean;
    }) {
        setPendingCheckin(checkinData);

        const verifyFacial = await handleGetEmployee();
        if (verifyFacial?.success !== true) {
            setPendingCheckin(null);
            setIsPreparingCheckin(false);
            return;
        }
        setIsPreparingCheckin(false);
    }

    async function handlePostCheckin(type: string) {
        setIsPreparingCheckin(true);

        if (!navigator.geolocation) {
            setIsPreparingCheckin(false);
            setGeoPrompt({
                open: true,
                type,
                reason: "Seu dispositivo ou navegador não possui suporte à geolocalização.",
                isDenied: true,
            });
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude, accuracy } = position.coords;

                const bodySchema = z.object({
                    type: z.enum(["ENTRY", "LUNCH_START", "LUNCH_END", "EXIT"]),
                    latitude: z.number().finite().min(-90).max(90),
                    longitude: z.number().finite().min(-180).max(180),
                    accuracy: z.number().finite().min(0).max(100000).optional(),
                });

                try {
                    bodySchema.parse({ type, latitude, longitude, accuracy });
                    await startFacialCheckin({
                        type,
                        latitude,
                        longitude,
                        accuracy,
                        geolocationDenied: false,
                        geolocationConsent: true,
                    });
                } catch (error) {
                    if (error instanceof z.ZodError) {
                        console.error("Erro de validação:", error.issues);
                    } else {
                        console.error("Erro ao preparar check-in:", error);
                        toast.error(error instanceof Error ? error.message : "Erro ao preparar check-in. Tente novamente.");
                    }
                    setPendingCheckin(null);
                    setIsPreparingCheckin(false);
                }
            },
            (error) => {
                console.warn("Geolocalização não obtida:", error);
                setIsPreparingCheckin(false);

                let reason = "Não foi possível obter a sua localização GPS.";
                const isDenied = error.code === 1; // PERMISSION_DENIED

                if (error.code === 1) {
                    reason = "A permissão de localização foi negada ou está desativada no navegador. Recomendamos permitir o acesso para registrar as coordenadas do ponto.";
                } else if (error.code === 2) {
                    reason = "O GPS do seu aparelho está desligado ou o sinal está indisponível. Ative a localização nas configurações do dispositivo.";
                } else if (error.code === 3) {
                    reason = "Tempo limite para obter a localização GPS foi excedido (sinal fraco).";
                }

                setGeoPrompt({
                    open: true,
                    type,
                    reason,
                    isDenied,
                });
            },
            {
                enableHighAccuracy: true,
                timeout: 8000,
                maximumAge: 0
            }
        );
    }

    async function handleProceedWithoutLocation() {
        if (!geoPrompt?.type) return;
        const type = geoPrompt.type;
        setGeoPrompt(null);
        setIsPreparingCheckin(true);

        await startFacialCheckin({
            type,
            latitude: null,
            longitude: null,
            accuracy: null,
            geolocationDenied: true,
            geolocationConsent: false,
        });
    }

    function handleRetryLocation() {
        if (!geoPrompt?.type) return;
        const type = geoPrompt.type;
        setGeoPrompt(null);
        handlePostCheckin(type);
    }

    function handleCancelLocationPrompt() {
        setGeoPrompt(null);
        setIsPreparingCheckin(false);
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
                toast.error("Registro facial pendente. Por favor, cadastre sua face antes de bater o ponto.");
                navigate("/register");
                return { success: false };
            }

            // Tenta obter o token facial no backend caso esteja online.
            // Se estiver em modo avião / offline, prossegue em contingência local sem o token efêmero.
            if (navigator.onLine) {
                try {
                    const data = await api.employees.issueFaceToken();
                    setFaceToken(data.token);
                } catch (err: unknown) {
                    console.warn("Não foi possível emitir token facial no servidor:", err);
                    const errorObj = err as { code?: string; message?: string };
                    if (errorObj?.code === "FACE_NOT_REGISTERED") {
                        stopCamera();
                        setVideoOpen(false);
                        setPendingCheckin(null);
                        navigate("/register");
                        return { success: false };
                    }

                    const isNetwork =
                        !navigator.onLine ||
                        err instanceof TypeError ||
                        (err instanceof Error &&
                            (err.message.toLowerCase().includes("failed to fetch") ||
                             err.message.toLowerCase().includes("networkerror") ||
                             err.message.toLowerCase().includes("network request failed") ||
                             err.message.toLowerCase().includes("load failed") ||
                             err.message.toLowerCase().includes("net::err") ||
                             err.message.toLowerCase().includes("conexão")));

                    if (!isNetwork) {
                        stopCamera();
                        setVideoOpen(false);
                        setPendingCheckin(null);
                        toast.error(errorObj?.message || "Erro ao iniciar validação facial. Tente novamente.");
                        return { success: false };
                    }

                    // Se for falha de rede/offline, segue em contingência sem emitir alert
                    setFaceToken(null);
                }
            } else {
                setFaceToken(null);
            }

            // Garante que os modelos de IA estejam 100% carregados antes de abrir a câmera
            if (!areFaceModelsLoaded()) {
                try {
                    await preloadFaceModels();
                } catch (loadErr) {
                    console.warn("Modelos de IA não puderam ser baixados offline:", loadErr);
                }
            }

            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: { ideal: 640 },
                        height: { ideal: 480 },
                        facingMode: "user"
                    }
                });

                streamRef.current = stream;
                setVideoOpen(true);
                setShowLiveness(true);
                setHeaderIsError(false);
                setMessage("Centralize seu rosto");

                if (videoRef.current && videoRef.current.srcObject !== stream) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play().catch((err) => console.error("Erro ao reproduzir vídeo:", err));
                }
            } catch (err) {
                console.error("Erro ao acessar a webcam:", err);
                stopCamera();
                setVideoOpen(false);
                setPendingCheckin(null);
                toast.error("Não foi possível acessar a câmera. Verifique as permissões do navegador.");
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
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
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

            // Se o navegador estiver sem conectividade, pula a tentativa remota imediatamente
            if (!navigator.onLine) {
                throw new TypeError("Failed to fetch (offline)");
            }

            const response = await api.checkins.create(pendingCheckin as CheckinCreateDto);

            // Desativa o spinner de registro para que o modal de sucesso com comprovante fique visível
            setIsRegistering(false);
            setComprovanteText(response.comprovante);
            setComprovanteDados(response.comprovanteDados || null);
            if (response.checkin?.checkin?.id) {
                setLastCheckinId(response.checkin.checkin.id);
            }
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
        } catch (error) {
            console.error("Erro ao registrar o ponto:", error);

            // 1. Resposta real do servidor HTTP (ApiError)
            // Se o servidor respondeu com status (400, 401, 403, 409, 429, 500, etc.), NUNCA é falta de internet!
            if (isApiError(error) || error instanceof ApiError) {
                setIsRegistering(false);
                setVideoOpen(false);
                setPendingCheckin(null);
                setFaceToken(null);
                setComprovanteText(null);
                setComprovanteDados(null);
                setLastCheckinId(null);

                const errorMsg = error.message || "Erro ao registrar o ponto. Tente novamente.";
                setMessage(errorMsg);
                toast.error(errorMsg);
                return;
            }

            // 2. Falha de rede nativa no navegador (sem resposta HTTP)
            // TypeError é lançado nativamente pelo fetch() quando a conexão não pode ser estabelecida
            const isFetchNetworkError =
                !navigator.onLine ||
                error instanceof TypeError ||
                (error instanceof Error &&
                    (error.message.toLowerCase().includes("failed to fetch") ||
                     error.message.toLowerCase().includes("networkerror") ||
                     error.message.toLowerCase().includes("network request failed") ||
                     error.message.toLowerCase().includes("load failed") ||
                     error.message.toLowerCase().includes("net::err") ||
                     error.message.toLowerCase().includes("conexão")));

            // Só entra em contingência offline se a requisição fetch tiver falhado genuinamente por rede
            const isNetworkError = isFetchNetworkError;

            // Se o navegador indica que está online, fazemos uma verificação de recuperação imediata:
            // pode ter ocorrido uma falha de gateway/proxy (ex: 502 Bad Gateway) APÓS o ponto
            // já ter sido salvo com sucesso no banco de dados!
            if (navigator.onLine && pendingCheckin?.type) {
                try {
                    const checkinsHoje = await api.checkins.list();
                    const existing = checkinsHoje.find(
                        (c) =>
                            c.type === pendingCheckin.type &&
                            Math.abs(new Date(c.createdAt).getTime() - Date.now()) < 3 * 60 * 1000
                    );

                    if (existing) {
                        // O ponto foi gravado no banco com sucesso antes da falha no gateway!
                        setIsRegistering(false);
                        setVideoOpen(false);
                        setIsSuccess(true);
                        setMessage("Ponto registrado com sucesso!");
                        setPendingCheckin(null);
                        setFaceToken(null);
                        const existingComprovante = "comprovante" in existing && typeof (existing as { comprovante?: unknown }).comprovante === "string"
                            ? (existing as { comprovante: string }).comprovante
                            : null;
                        setComprovanteText(existingComprovante);
                        setCheckins((prev) => {
                            const filtered = prev.filter((c) => c.type !== existing.type);
                            return [...filtered, existing as ChekinProps];
                        });
                        toast.success("Ponto registrado com sucesso!");
                        return;
                    }
                } catch {
                    // Falha ao listar checkins confirma que a rede/servidor está inacessível
                }
            }

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

                    const dateObj = new Date(offlineItem.timestamp);
                    const dataStr = dateObj.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
                    const horaStr = dateObj.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
                    const fullHash = (offlineItem.hash || "").toUpperCase();
                    const hashLinha1 = fullHash.substring(0, 32);
                    const hashLinha2 = fullHash.substring(32, 64);

                    const formatTipo = (t: string) => {
                        switch (t) {
                            case "ENTRY": return "Entrada";
                            case "LUNCH_START": return "Início de Almoço";
                            case "LUNCH_END": return "Retorno de Almoço";
                            case "EXIT": return "Saída";
                            default: return t;
                        }
                    };

                    const offlineComprovante: ComprovanteDados = {
                        softwareName: "Ponto Fragata",
                        nsr: "PENDENTE",
                        data: dataStr,
                        hora: horaStr,
                        tipo: formatTipo(offlineItem.type),
                        employeeName: user?.name || offlineItem.userName || "Colaborador",
                        employeeCpf: user?.cpf || "",
                        companyName: (typeof company === "string" ? company : "") || "Empresa",
                        companyCnpj: "",
                        inpi: null,
                        hash: fullHash,
                        hashLinha1,
                        hashLinha2,
                        assinadoPor: "Fragata Soluções Digitais LTDA",
                        dataHoraEmissao: `${dataStr} ${horaStr}`,
                        localizacao: offlineItem.latitude != null && offlineItem.longitude != null
                            ? `${offlineItem.latitude.toFixed(4)}, ${offlineItem.longitude.toFixed(4)}`
                            : "Não informada",
                    };

                    setComprovanteDados(offlineComprovante);

                    // Atualiza otimisticamente a lista de pontos para os botões refletirem o registro mesmo offline
                    setCheckins((prev) => {
                        const filtered = prev.filter((c) => c.type !== offlineItem.type);
                        return [
                            ...filtered,
                            {
                                id: offlineItem.id,
                                type: offlineItem.type,
                                createdAt: offlineItem.createdAt,
                                latitude: offlineItem.latitude,
                                longitude: offlineItem.longitude,
                            } as ChekinProps,
                        ];
                    });

                    setIsRegistering(false);
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
            setComprovanteDados(null);
            setLastCheckinId(null);
            const errorMsg = error instanceof Error ? error.message : "Erro ao registrar o ponto. Tente novamente.";
            setMessage(errorMsg);
            toast.error(errorMsg);
        } finally {
            // Sincroniza sempre o estado dos pontos com o backend.
            // Garante que, se o ponto foi gravado no banco mesmo com erro posterior de resposta,
            // a tela seja atualizada e o botão trave como 'Ponto Registrado', prevenindo duplicidade.
            await handleGetCheckin();
        }
    }

    async function handleDownloadPdf() {
        if (!lastCheckinId) {
            toast.error("Identificador do ponto indisponível para download.");
            return;
        }

        try {
            setIsDownloadingPdf(true);
            const blob = await api.checkins.downloadComprovantePdf(lastCheckinId);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            const nsr = comprovanteDados?.nsr || "comprovante";
            a.download = `comprovante-ponto-${nsr}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            toast.success("Comprovante baixado com sucesso!");
        } catch (error) {
            console.error("Erro ao baixar PDF do comprovante:", error);
            toast.error("Erro ao baixar comprovante em PDF.");
        } finally {
            setIsDownloadingPdf(false);
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
            if (user?.id) {
                try {
                    const pendingOffline = await getPendingOfflineCheckins(user.id);
                    if (pendingOffline.length > 0) {
                        setCheckins((prev) => {
                            const existingTypes = new Set(prev.map((c) => c.type));
                            const newOfflineItems = pendingOffline
                                .filter((item) => !existingTypes.has(item.type))
                                .map((item) => ({
                                    id: item.id,
                                    type: item.type,
                                    createdAt: item.createdAt,
                                    latitude: item.latitude,
                                    longitude: item.longitude,
                                } as ChekinProps));
                            return [...prev, ...newOfflineItems];
                        });
                    }
                } catch (offlineErr) {
                    console.warn("Erro ao carregar fila offline:", offlineErr);
                }
            }
            setIsLoadingCheckins(false);
        }
    }, [navigate, token, user?.id]);

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
        return () => {
            stopCamera();
        };
    }, []);

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
                            ref={handleVideoRef}
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

                        {showLiveness && (
                            <LivenessChallenge
                                videoRef={videoRef}
                                faceToken={faceToken || undefined}
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
                                    <div className="flex items-center justify-center gap-3 mb-3">
                                        <span className="text-3xl">{isOfflineSuccess ? "📡" : "✅"}</span>
                                        <div>
                                            <h2 className={`${isOfflineSuccess ? "text-amber-600 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400"} text-lg font-bold`}>
                                                {isOfflineSuccess ? "Ponto Registrado Offline!" : "Ponto Registrado com Sucesso!"}
                                            </h2>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                {isOfflineSuccess ? "Comprovante provisório emitido (Portaria 671)" : "Comprovante emitido (Portaria 671/MTP)"}
                                            </p>
                                        </div>
                                    </div>
                                    {(comprovanteDados || comprovanteText) && (
                                        <div className="relative flex-1 min-h-0 my-2 w-full max-h-[380px] overflow-y-auto pr-1">
                                            <ComprovanteTicket
                                                dados={comprovanteDados}
                                                rawText={comprovanteText}
                                                isOffline={isOfflineSuccess}
                                            />
                                        </div>
                                    )}
                                    <div className="flex items-center gap-3 mt-4 pt-2 border-t border-slate-100 dark:border-white/10">
                                        {!isOfflineSuccess && (
                                            <button
                                                type="button"
                                                disabled={isDownloadingPdf || !lastCheckinId}
                                                onClick={handleDownloadPdf}
                                                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold transition-all shadow-md shadow-emerald-900/20 cursor-pointer uppercase tracking-wider disabled:opacity-50"
                                            >
                                                {isDownloadingPdf ? (
                                                    <Loader2 size={16} className="animate-spin" />
                                                ) : (
                                                    <Download size={16} />
                                                )}
                                                <span>{isDownloadingPdf ? "Baixando..." : "Baixar"}</span>
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setVideoOpen(false);
                                                setIsSuccess(false);
                                                setIsOfflineSuccess(false);
                                                setComprovanteText(null);
                                                setComprovanteDados(null);
                                                setLastCheckinId(null);
                                            }}
                                            className={`${isOfflineSuccess ? "w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-900/20 active:scale-95" : "flex-1 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5"} py-3 px-4 rounded-xl text-xs font-semibold transition-all cursor-pointer uppercase tracking-wider text-center`}
                                        >
                                            Concluir
                                        </button>
                                    </div>
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

            {/* MODAL DE SOLICITAÇÃO / ATIVAÇÃO DE GEOLOCALIZAÇÃO */}
            {geoPrompt && geoPrompt.open && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[#111113] border border-slate-200 dark:border-white/10 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
                        {/* Header do Modal */}
                        <div className="flex items-start justify-between gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
                                <MapPinOff size={24} />
                            </div>
                            <button
                                type="button"
                                onClick={handleCancelLocationPrompt}
                                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all cursor-pointer"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div>
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                                Ativar Localização do Dispositivo
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                                {geoPrompt.reason || "Não foi possível obter a sua localização GPS."}
                            </p>
                        </div>

                        {/* Card com orientações / Portaria 671 */}
                        <div className="bg-slate-50 dark:bg-black/30 border border-slate-200/80 dark:border-white/5 rounded-2xl p-4 space-y-2 text-xs">
                            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold">
                                <Navigation size={15} />
                                <span>Por que ativar a localização?</span>
                            </div>
                            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                                A Portaria 671/MTE requer o registro das coordenadas geográficas para auditoria e conferência do polo de trabalho.
                            </p>
                            <div className="pt-2 border-t border-slate-200/60 dark:border-white/5 text-[11px] text-slate-500 dark:text-slate-400">
                                💡 <strong>Dica:</strong> Certifique-se de que o GPS do seu aparelho está ligado e permita o acesso à localização no ícone de cadeado do navegador.
                            </div>
                        </div>

                        {/* Ações */}
                        <div className="flex flex-col gap-2.5 pt-2">
                            <button
                                type="button"
                                onClick={handleRetryLocation}
                                className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold transition-all shadow-md shadow-emerald-900/20 active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                            >
                                <Navigation size={16} />
                                Tentar Ativar / Conceder Localização
                            </button>

                            <button
                                type="button"
                                onClick={handleProceedWithoutLocation}
                                className="w-full py-3 px-4 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 rounded-2xl text-xs font-semibold transition-all active:scale-95 cursor-pointer text-center"
                            >
                                Prosseguir sem Localização (Conforme CLT)
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* CONTEÚDO PRINCIPAL */}
            <div className="w-full space-y-6 min-w-0">
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