import { useState, useEffect, useRef } from "react"

import { verificarPonto } from "../components/VerifyDescriptor"
import { API_URL } from "../utils/api"

import { LogIn, Utensils, Coffee, LogOut } from "lucide-react"
import * as faceapi from 'face-api.js';

import { z } from "zod"
import { Button } from "../components/Button"

export function PontoPage() {

    const [videoOpen, setVideoOpen] = useState<boolean>(false)
    const [message, setMessage] = useState<string>("Iniciando validação...")

    const videoRef = useRef<HTMLVideoElement>(null)

    const [isSuccess, setIsSuccess] = useState(false);

    async function handleCheckin(type: string) {

        navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = position.coords;


            const bodySchema = z.object({
                type: z.enum(["ENTRY", "LUNCH_START", "LUNCH_END", "EXIT"]),
                latitude: z.number(),
                longitude: z.number()
            })

            const token = localStorage.getItem("@viggo:token")

            try {
                if (!token) {
                    return window.location.href = "/"
                }

                const verifyFacial = await handleGetEmployee()
                if (verifyFacial?.success !== true) return

                setMessage("Registrando no sistema...");

                bodySchema.parse({ type, latitude, longitude })

                const response = await fetch(`${API_URL}/checkins`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "authorization": `Bearer ${JSON.parse(token)}`
                    },
                    body: JSON.stringify({ type, latitude, longitude })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    setMessage(errorData.message);
                    return;
                }

                setIsSuccess(true); // Ativa o modal de sucesso
                setMessage("Ponto registrado com sucesso!");

            } catch (error) {
                if (error instanceof z.ZodError) {
                    console.error("Erro de validação:", error.issues);
                } else {
                    console.error("Erro ao registrar o ponto:", error);
                    alert("Erro ao registrar o ponto. Tente novamente.");
                }
            } finally {
                // Fecha o vídeo automaticamente após 3 segundos ou no X do modal
                setTimeout(() => {
                    setIsSuccess(false);
                    setVideoOpen(false);
                }, 3000);
            }
        }, (error) => {
            console.error("Erro ao obter localização:", error);
            alert("Erro ao obter localização. Permita o acesso à localização e tente novamente.");
        }, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        });
    }

    async function handleGetEmployee() {

        const token = localStorage.getItem("@viggo:token")

        try {
            if (!token) {
                window.location.href = "/"
                return { success: false }
            }

            const response = await fetch(`${API_URL}/employees/face`, {
                method: "GET",
                headers: {
                    "Content-type": "application/json",
                    "authorization": `Bearer ${JSON.parse(token)}`
                }
            })

            if (response.status === 403) {
                window.location.href = "/register"
                return { success: false }
            }

            if (!response.ok) return alert("erro")

            setVideoOpen(true)
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: 640,
                        height: 480,
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

                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            } catch (err) {
                console.error("Erro ao acessar a webcam:", err);
                return { success: false };
            }

            const data = await response.json()
            await verificarPonto(data, videoRef, setMessage)

            return { success: true };

        } catch (error) {
            return { success: false }
        }
    }

    async function handleGetCheckin() {
        const token = localStorage.getItem("@viggo:token")

        try {

            if (!token) return window.location.href = "/"

            const response = await fetch(`${API_URL}/checkins`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "authorization": `Bearer ${JSON.parse(token)}`
                }
            })

            if (!response.ok) {
                const errorData = await response.json();
                console.error("Erro ao buscar os pontos:", errorData);
                alert("Erro ao buscar os pontos: " + errorData.message);
                return;
            }

            const data = await response.json();
            console.log(data)

        } catch (error) {
            console.error("Erro ao buscar os pontos:", error);
            alert("Erro ao buscar os pontos. Tente novamente.");
        }

    }

    useEffect(() => {
        handleGetCheckin()
    },[])

    useEffect(() => {
        const carregarModelos = async () => {
            try {
                // O caminho '/models' deve conter os arquivos .json e .bin da face-api
                // Verifique se essa pasta está dentro da sua pasta 'public'
                const MODEL_URL = '/models';

                await Promise.all([
                    faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
                ]);

                console.log("Modelos da Face-API carregados com sucesso!");
            } catch (error) {
                console.error("Erro ao carregar modelos:", error);
            }
        };

        carregarModelos();
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
        <div className=" bg-slate-50 font-sans antialiased text-slate-900">
            {videoOpen && (
                <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-black/95 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="relative w-full max-w-2xl bg-slate-900 sm:rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col h-full sm:h-auto">

                        {/* MENSAGEM NO TOPO DO VÍDEO */}
                        <div className="absolute top-0 left-0 right-0 z-100 bg-emerald-400 w-full shadow-lg p-3 h-[60px]">
                            <p className="text-white text-sm md:text-lg font-bold text-center uppercase tracking-wider">
                                {message}
                            </p>
                        </div>

                        {/* O VÍDEO */}
                        <video
                            ref={videoRef}
                            autoPlay
                            muted
                            playsInline
                            className="w-[400px] object-cover h-full sm:h-[60vh] md:h-[700px]"
                        />

                        {/* MÁSCARA OVAL EMERALD */}
                        <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
                            <div
                                className="md:w-[360px] md:h-[460px] w-[80%] h-[60%] shadow-[0_0_0_9999px_rgba(0,0,0,0.7)] border-4 border-dashed border-emerald-400/60"
                                style={{ borderRadius: '50% / 40%' }}
                            />
                        </div>

                        {/* BOTÃO CANCELAR */}
                        <div className="absolute bottom-8 left-0 right-0 z-20 flex justify-center px-4">
                            <button
                                onClick={() => setVideoOpen(false)}
                                className="w-full max-w-[200px] py-3 bg-emerald-400 text-white rounded-full font-bold hover:bg-emerald-500 transition-all active:scale-95 shadow-lg shadow-emerald-900/40 cursor-pointer uppercase text-xs tracking-widest"
                            >
                                Cancelar
                            </button>
                        </div>
                        {!isSuccess && (
                            <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center">
                                <div className="relative md:w-[360px] md:h-[460px] w-[80%] h-[60%] border-2 border-emerald-500 rounded-[50%/40%] overflow-hidden">
                                    {/* Linha de Scanner Animada */}
                                    <div className="w-full h-1 bg-emerald-500 shadow-[0_0_15px_#34d399] absolute top-0 animate-[scan_2s_linear_infinite]" />
                                </div>
                            </div>
                        )}
                        {isSuccess && (
                            <div className="absolute inset-0 z-[110] bg-emerald-500 flex flex-col items-center justify-center animate-in zoom-in duration-300">
                                <div className="bg-white rounded-full p-4 mb-4 shadow-xl">
                                    <span className="text-5xl">✅</span>
                                </div>
                                <h2 className="text-white text-2xl font-bold">Ponto Concluído!</h2>
                                <p className="text-emerald-200 mt-2">{new Date().toLocaleTimeString()}</p>

                                <button
                                    onClick={() => { setVideoOpen(false); setIsSuccess(false); }}
                                    className="mt-8 bg-white/20 hover:bg-white/30 p-2 rounded-full text-white transition-all"
                                >
                                    <span className="text-sm px-4">FECHAR (X)</span>
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

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 md:gap-6">
                    {[
                        { label: "Entrada", type: "ENTRY", icon: <LogIn className="text-emerald-500" size={32} /> },
                        { label: "Início Almoço", type: "LUNCH_START", icon: <Utensils className="text-emerald-500" size={32} /> },
                        { label: "Retorno Almoço", type: "LUNCH_END", icon: <Coffee className="text-emerald-500" size={32} /> },
                        { label: "Saída", type: "EXIT", icon: <LogOut className="text-red-500" size={32} /> },
                    ].map((item) => (
                        <section
                            key={item.type}
                            className="group relative bg-white border border-slate-200 rounded-3xl p-6 md:p-8 flex flex-col items-center gap-6 transition-all hover:border-emerald-400 hover:shadow-xl hover:shadow-emerald-900/5 shadow-sm"
                        >
                            <div className="text-4xl">{item.icon}</div>
                            <div className="text-center">
                                <h3 className="text-xl font-bold text-slate-800">{item.label}</h3>
                                <p className="text-slate-400 text-xs mt-1">Requer validação facial</p>
                            </div>

                            <Button
                                title={"Registrar Agora"}
                                onClick={() => handleCheckin(item.type)}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-100 transition-all active:scale-95 disabled:grayscale cursor-pointer"
                            />
                        </section>
                    ))}
                </div>
            </main>
        </div>
    );
}