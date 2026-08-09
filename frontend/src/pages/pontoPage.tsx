import { useState, useEffect, useRef } from "react"

import { api } from "../services/api"
import { LivenessChallenge } from "../components/LivenessChallenge"
import { useAuth } from "../hooks/useAuth"

import { LogIn, Utensils, Coffee, LogOut, ScanFace } from "lucide-react"
import { PontoPageSkeleton } from "../components/PontoPageSkeleton"
import { z } from "zod"
import { Button } from "../components/Button"
import type { CheckinCreateDto } from "../services/api"

type ChekinProps = {
    id: string,
    createdAt: string,
    type: "ENTRY" | "LUNCH_START" | "LUNCH_END" | "EXIT",
    latitude: number,
    longitude: number,
}

export function PontoPage() {
    const { token, user } = useAuth();

    const [videoOpen, setVideoOpen] = useState<boolean>(false)
    const [message, setMessage] = useState<string>("Iniciando validação...")

    const [checkins, setCheckins] = useState<ChekinProps[]>([])
    const [isLoadingCheckins, setIsLoadingCheckins] = useState(true)
    const [hasFaceRegistered, setHasFaceRegistered] = useState(true)

    const videoRef = useRef<HTMLVideoElement>(null)

    const [isSuccess, setIsSuccess] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);
    const [faceToken, setFaceToken] = useState<string | null>(null);
    const [showLiveness, setShowLiveness] = useState(false);
    const [isPreparingCheckin, setIsPreparingCheckin] = useState(false);
    const [comprovanteText, setComprovanteText] = useState<string | null>(null);
    const [pendingCheckin, setPendingCheckin] = useState<{
        type: string;
        latitude: number;
        longitude: number;
    } | null>(null);

    async function handlePostCheckin(type: string) {
        setIsPreparingCheckin(true);
        navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = position.coords;

            const bodySchema = z.object({
                type: z.enum(["ENTRY", "LUNCH_START", "LUNCH_END", "EXIT"]),
                latitude: z.number(),
                longitude: z.number()
            })

            try {
                bodySchema.parse({ type, latitude, longitude })

                setPendingCheckin({ type, latitude, longitude });

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
        }, (error) => {
            console.error("Erro ao obter localização:", error);
            alert("Erro ao obter localização. Permita o acesso à localização e tente novamente.");
            setIsPreparingCheckin(false);
        }, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        });
    }

    async function handleGetEmployee() {
        try {
            if (!token) {
                window.location.assign("/")
                return { success: false }
            }

            const data = await api.employees.issueFaceToken()
            setFaceToken(data.token);
            setVideoOpen(true)
            setShowLiveness(true)
            setMessage("Iniciando validação...")
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: { ideal: 640 },
                        height: { ideal: 480 },
                        facingMode: "user"
                    }
                });

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
                setPendingCheckin(null);
                return { success: false };
            }

            return { success: true };

        } catch {
            setPendingCheckin(null);
            return { success: false }
        }
    }

    function stopCamera() {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach((track) => track.stop());
            videoRef.current.srcObject = null;
        }
    }

    async function handleLivenessComplete(_descriptor: Float32Array) {
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
        setMessage("Registrando ponto...");

        try {
            if (!token) {
                setIsRegistering(false);
                setVideoOpen(false);
                window.location.assign("/");
                return;
            }

            const response = await api.checkins.create(pendingCheckin as CheckinCreateDto);

            setComprovanteText(response.comprovante);
            setIsSuccess(true);
            setMessage("Ponto registrado com sucesso!");
            setPendingCheckin(null);
            setFaceToken(null);

            await handleGetCheckin();

            setTimeout(() => {
                setIsSuccess(false);
                setIsRegistering(false);
                setVideoOpen(false);
            }, 3000);
        } catch (error) {
            console.error("Erro ao registrar o ponto:", error);
            setIsRegistering(false);
            setVideoOpen(false);
            setPendingCheckin(null);
            setFaceToken(null);
            setComprovanteText(null);
            setMessage(error instanceof Error ? error.message : "Erro ao registrar o ponto. Tente novamente.");
        }
    }

    const handleLivenessCancel = () => {
        stopCamera();
        setShowLiveness(false);
        setVideoOpen(false);
        setPendingCheckin(null);
        setFaceToken(null);
        setMessage("Validação cancelada");
    };

    async function handleGetCheckin() {
        setIsLoadingCheckins(true)

        try {
            if (!token) return window.location.assign("/")

            const data = await api.checkins.list();
            setCheckins(data)

        } catch (error) {
            console.error("Erro ao buscar os pontos:", error);
            alert(error instanceof Error ? error.message : "Erro ao buscar os pontos. Tente novamente.");
        } finally {
            setIsLoadingCheckins(false)
        }

    }

    useEffect(() => {
        setHasFaceRegistered(user?.hasFaceDescriptor ? true : false);
        handleGetCheckin()
    }, [])

    useEffect(() => {
        if (videoOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [videoOpen]);

    return (
        <div className=" bg-slate-50 font-sans antialiased text-slate-900">
            {videoOpen && (
                <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-black/95 backdrop-blur-md animate-in fade-in duration-300">
                    {/* CORREÇÃO 1: h-auto removido no mobile e flex col items-center para garantir alinhamento */}
                    <div className="relative w-full max-w-2xl bg-slate-900 sm:rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col justify-center items-center h-[80vh] max-h-[700px]">

                        {/* MENSAGEM NO TOPO DO VÍDEO */}
                        <div className="absolute top-0 left-0 right-0 z-[100] bg-emerald-400 w-full shadow-lg p-3 h-[60px] flex items-center justify-center">
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
                                className="md:w-[360px] md:h-[460px] w-[80%] h-[60%] shadow-[0_0_0_9999px_rgba(0,0,0,0.7)] border-4 border-dashed border-emerald-400/60"
                                style={{ borderRadius: '50% / 40%' }}
                            />
                        </div>

                        {showLiveness && faceToken && (
                            <LivenessChallenge
                                videoRef={videoRef}
                                faceToken={faceToken}
                                onComplete={handleLivenessComplete}
                                onCancel={handleLivenessCancel}
                                onModelsLoaded={() => setMessage("Centralize seu rosto")}
                                onStepChange={(msg) => setMessage(msg)}
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
                            <div className="absolute inset-0 z-[110] bg-emerald-500 flex flex-col items-center justify-center animate-in zoom-in duration-300 p-6">
                                <div className="bg-white rounded-2xl p-5 mb-4 shadow-xl max-w-sm w-full">
                                    <div className="flex items-center justify-center gap-2 mb-3">
                                        <span className="text-3xl">✅</span>
                                        <h2 className="text-emerald-700 text-lg font-bold">Ponto Registrado!</h2>
                                    </div>
                                    {comprovanteText && (
                                        <pre className="text-[10px] sm:text-xs text-slate-700 bg-slate-50 rounded-lg p-3 whitespace-pre-wrap font-mono leading-relaxed border border-slate-200 max-h-[280px] overflow-y-auto">
                                            {comprovanteText}
                                        </pre>
                                    )}
                                </div>
                                <button
                                    onClick={() => { setVideoOpen(false); setIsSuccess(false); setComprovanteText(null); }}
                                    className="mt-4 bg-white/20 hover:bg-white/30 p-2 rounded-full text-white transition-all"
                                >
                                    <span className="text-sm px-4">FECHAR</span>
                                </button>
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
            <main className="max-w-6xl mx-auto p-4 md:p-8">
                <div className="mb-8">
                    <h2 className="text-lg font-semibold text-slate-500 uppercase tracking-wider">
                        Registros Disponíveis
                    </h2>
                    <p className="text-slate-400 text-sm">
                        Selecione o tipo de marcação desejada abaixo.
                    </p>
                </div>

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
                                    className={`group relative bg-white border border-slate-200 rounded-3xl p-6 md:p-8 flex flex-col items-center gap-6 transition-all hover:shadow-xl hover:shadow-emerald-900/5 shadow-sm ${hasRegistered ? "hover:border-gray-400" : "hover:border-emerald-400 "}`}
                                >
                                    <div className="text-4xl">{item.icon}</div>
                                    <div className="text-center">
                                        <h3 className="text-xl font-bold text-slate-800">{item.label}</h3>
                                        <p className="text-emerald-400 text-xs mt-1">
                                            {hasRegistered ? `Registrado às ${checkinTime}` : "Requer validação facial"}
                                        </p>
                                    </div>

                                    <Button
                                        title={hasRegistered ? "Ponto Registrado" : isPreparingCheckin ? "Preparando..." : "Registrar Ponto"}
                                        disabled={hasRegistered || isPreparingCheckin}
                                        onClick={() => handlePostCheckin(item.type)}
                                        className={`w-full bg-emerald-600  text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-100 transition-all active:scale-95 disabled:grayscale  ${hasRegistered ? "opacity-70 cursor-not-allowed " : isPreparingCheckin ? "opacity-70 cursor-wait" : "cursor-pointer hover:bg-emerald-700"}`}
                                    />

                                </section>
                            );
                        })}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 md:gap-6">
                        <section className="group relative bg-white border border-slate-200 rounded-3xl p-6 md:p-8 flex flex-col items-center gap-6 transition-all hover:shadow-xl hover:shadow-emerald-900/5 shadow-sm hover:border-emerald-400">
                            <ScanFace className="text-emerald-600" size={48} />
                            <div className="text-center">
                                <h3 className="text-xl font-bold text-slate-800">Registro Facial Pendente</h3>
                                <p className="text-emerald-600 text-xs mt-1">
                                    Cadastre sua facial para registrar pontos
                                </p>
                            </div>

                            <Button
                                title="Cadastrar Facial"
                                onClick={() => window.location.href = "/register"}
                                className="w-full bg-emerald-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-100 transition-all active:scale-95 cursor-pointer hover:bg-emerald-600"
                            />
                        </section>
                    </div>
                )}
            </main>
        </div>
    );
}