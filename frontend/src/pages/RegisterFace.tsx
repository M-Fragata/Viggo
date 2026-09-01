import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { LivenessChallenge } from "../components/LivenessChallenge";
import { api } from "../services/api";
import { useAuth } from "../hooks/useAuth";
import { preloadFaceModels, areFaceModelsLoaded } from "../utils/faceModels";

export function RegisterFace() {
    const [videoOpen, setVideoOpen] = useState(false);
    const [showLiveness, setShowLiveness] = useState(false);
    const [message, setMessage] = useState("Iniciando cadastro facial...");
    const [isSuccess, setIsSuccess] = useState(false);
    const [isRegistering, setIsRegistering] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const { user, token, refreshUser } = useAuth();
    const [check, setCheck] = useState<boolean>(false);
    const navigate = useNavigate();

    useEffect(() => {
        // Inicia o carregamento dos modelos em background imediatamente
        preloadFaceModels().catch((err) => {
            console.error("Erro ao pré-carregar modelos face-api:", err);
        });

        const initCamera = async () => {
            try {
                if (!areFaceModelsLoaded()) {
                    await preloadFaceModels();
                }

                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: { ideal: 640 },
                        height: { ideal: 480 },
                        facingMode: "user"
                    }
                });

                setVideoOpen(true);
                setShowLiveness(true);
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

                    await new Promise(resolve => setTimeout(resolve, 300));
                }
            } catch (err) {
                console.error("Erro ao acessar a câmera:", err);
                alert("Câmera não encontrada ou permissão negada. Permita câmera e atualize.");
                window.location.href = "/";
            }
        };

        if (!check) initCamera();

        const currentVideo = videoRef.current;
        return () => {
            if (currentVideo && currentVideo.srcObject) {
                const stream = currentVideo.srcObject as MediaStream;
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [check]);

    const handleLivenessComplete = async (descriptor: Float32Array) => {
        setShowLiveness(false);

        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        setVideoOpen(false);
        setCheck(true)
        setIsRegistering(true);
        setMessage("Salvando cadastro facial...");

        if (!user || !token) {
            window.location.href = "/";
            return;
        }

        try {
            await api.employees.updateFaceDescriptor(user.id, Array.from(descriptor));
            await refreshUser();

            setIsRegistering(false);
            setIsSuccess(true);
            setMessage("Cadastro facial concluído!");

            setTimeout(() => {
                navigate("/ponto");
            }, 1500);

        } catch (error) {
            console.error("Erro ao salvar cadastro:", error);
            setMessage(error instanceof Error ? error.message : "Erro ao salvar. Tente novamente.");
            setIsRegistering(false);
        }
    };

    const handleLivenessCancel = () => {
        setShowLiveness(false);
        setVideoOpen(false);
        window.location.href = "/ponto";
    };

    if (!videoOpen && !check) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent" />
                <p className="mt-4 text-slate-600 dark:text-slate-300 font-medium">Preparando validação facial...</p>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-black/95 backdrop-blur-md animate-in fade-in duration-300">
            <div className="relative w-full max-w-2xl bg-slate-900 sm:rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col justify-center items-center h-[80vh] max-h-[700px]">

                <div className="absolute top-0 left-0 right-0 z-[100] bg-emerald-400 w-full shadow-lg p-3 h-[60px] flex items-center justify-center">
                    <p className="text-white text-sm md:text-lg font-bold text-center uppercase tracking-wider">
                        {message}
                    </p>
                </div>

                <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                    style={{ transform: 'scaleX(-1)' }}
                />

                <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
                    <div
                        className="md:w-[360px] md:h-[460px] w-[80%] h-[60%] shadow-[0_0_0_9999px_rgba(0,0,0,0.7)] border-4 border-dashed border-emerald-400/60"
                        style={{ borderRadius: '50% / 40%' }}
                    />
                </div>

                {showLiveness && (
                    <LivenessChallenge
                        videoRef={videoRef}
                        onComplete={handleLivenessComplete}
                        onCancel={handleLivenessCancel}
                        onModelsLoaded={() => {
                            setMessage("Centralize seu rosto");
                        }}
                    />
                )}

                {isRegistering && (
                    <div className="absolute inset-0 z-[110] bg-emerald-500/95 flex flex-col items-center justify-center animate-in zoom-in duration-300">
                        <div className="relative mb-6">
                            <div className="w-24 h-24 border-4 border-white/30 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-emerald-300 rounded-full animate-spin border-t-transparent" />
                        </div>
                        <h2 className="text-white text-2xl font-bold">Salvando Cadastro...</h2>
                        <p className="text-emerald-200 mt-2">{message}</p>
                    </div>
                )}

                {isSuccess && (
                    <div className="absolute inset-0 z-[110] bg-emerald-500 flex flex-col items-center justify-center animate-in zoom-in duration-300">
                        <div className="bg-white rounded-full p-4 mb-4 shadow-xl">
                            <span className="text-5xl">✅</span>
                        </div>
                        <h2 className="text-white text-2xl font-bold">Cadastro Concluído!</h2>
                        <p className="text-emerald-200 mt-2">Redirecionando...</p>
                    </div>
                )}
            </div>
        </div>
    );
}