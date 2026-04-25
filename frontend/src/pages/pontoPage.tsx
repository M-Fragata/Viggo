import { useState, useEffect, useRef } from "react"

import { API_URL } from "../utils/api"

import { verificarPonto } from "../components/VerifyDescriptor"
import * as faceapi from 'face-api.js';

import { z } from "zod"
import { Button } from "../components/Button"

export function PontoPage() {

    const [hour, setHour] = useState(new Date().toLocaleTimeString())
    const [videoOpen, setVideoOpen] = useState<boolean>(false)
    const [message, setMessage] = useState<string>("Iniciando validação...")

    const getStatusMessage = () => {
        if (hour >= "07:50:00" && hour <= "08:20:00") return "Ponto de entrada"
        if (hour >= "11:50:00" && hour <= "12:20:00") return "Ponto de entrada de almoço"
        if (hour >= "12:40:00" && hour <= "13:20:00") return "Ponto de retorno de almoço"
        if (hour >= "17:50:00" && hour <= "18:00:00") return "Ponto de saída"
        return "Fora do horário de bater ponto"
    }

    const status = getStatusMessage();
    const isOutside = status === "Fora do horário de bater ponto";
    const videoRef = useRef<HTMLVideoElement>(null)

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
                    alert("Token não encontrado. Faça login novamente.");
                    return;
                }

                const verifyFacial = await handleGetEmployee()
                if (verifyFacial?.success !== true) return

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
                    console.error("Erro ao registrar o ponto:", errorData);
                    alert("Erro ao registrar o ponto: " + errorData.message);
                    return;
                }

            } catch (error) {
                if (error instanceof z.ZodError) {
                    console.error("Erro de validação:", error.issues);
                } else {
                    console.error("Erro ao registrar o ponto:", error);
                    alert("Erro ao registrar o ponto. Tente novamente.");
                }
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
                alert("Token não encontrado. Faça login novamente.");
                return;
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

            const data = await response.json()

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
                alert("Não foi possível abrir a câmera. Verifique as permissões.");
                return { success: false };
            }

            let tentativas = 0;
            let sucessoFacial = false;

            while (tentativas < 10 && !sucessoFacial) {
                const resultado = await verificarPonto(data, videoRef, setMessage);

                if (resultado?.success) {
                    sucessoFacial = true;
                    break;
                }

                // Espera 500ms antes da próxima tentativa
                await new Promise(resolve => setTimeout(resolve, 500));
                tentativas++;
                console.log(`Tentativda: ${tentativas}`)
            }

            if (!sucessoFacial) {
                alert("Não foi possível confirmar sua identidade. Tente novamente em um local iluminado.");
                return { success: false };
            }

            return { success: true };

        } catch (error) {
            return { success: false }
        } finally {
            setVideoOpen(false)
        }
    }

    useEffect(() => {
        const timer = setInterval(() => {
            setHour(new Date().toLocaleTimeString())
        }, 1000)

        return () => clearInterval(timer)
    }, [])

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
                        <div className="absolute top-0 left-0 right-0 z-[100] bg-emerald-400 w-full shadow-lg">
                            <p className="text-white text-sm md:text-lg font-bold px-6 py-2 text-center uppercase tracking-wider">
                                {message}
                            </p>
                        </div>

                        {/* O VÍDEO */}
                        <video
                            ref={videoRef}
                            autoPlay
                            muted
                            playsInline
                            className="w-full object-cover h-full sm:h-[60vh] md:h-[500px]"
                        />

                        {/* MÁSCARA OVAL EMERALD */}
                        <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
                            <div
                                className="w-[260px] h-[360px] shadow-[0_0_0_9999px_rgba(0,0,0,0.7)] border-4 border-dashed border-emerald-400/60"
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
                        { label: "Entrada", type: "ENTRY", icon: "🌅" },
                        { label: "Início Almoço", type: "LUNCH_START", icon: "🍽️" },
                        { label: "Retorno Almoço", type: "LUNCH_END", icon: "☕" },
                        { label: "Saída", type: "EXIT", icon: "🏠" },
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
                                title={isOutside ? "Aguarde o horário" : "Registrar Agora"}
                                onClick={() => handleCheckin(item.type)}
                                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-200 transition-all active:scale-95 disabled:grayscale cursor-pointer"
                            />
                        </section>
                    ))}
                </div>
            </main>
        </div>
    );
}