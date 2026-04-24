import { useState, useEffect, useRef } from "react"

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

                const response = await fetch("http://localhost:3333/checkins", {
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

                const data = await response.json();

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

            const response = await fetch("http://localhost:3333/employees/face", {
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

    return (
        <div>
            <header className="flex gap-2 justify-center p-6 border rounded-lg">
                <h1>Ponto Page</h1>
                <p>Horário: {hour}</p>
            </header>
            {videoOpen && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-300">

                    {/* Container Principal - DEVE SER RELATIVE */}
                    <div className="relative w-full max-w-2xl bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-700">

                        {/* MENSAGEM: Agora absoluta em relação ao container do vídeo */}
                        <div className="absolute rounded-t-2xl top-0 left-0 right-0 z-[100] flex justify-center px-4 pointer-events-none bg-emerald-400 w-full">
                            <p className=" text-white text-sm md:text-lg font-bold px-6 py-2 rounded-full shadow-lg shadow-emerald-900/20">
                                {message}
                            </p>
                        </div>

                        {/* O Vídeo */}
                        <video
                            ref={videoRef}
                            autoPlay
                            muted
                            playsInline
                            className="w-full object-cover h-[100dvh] sm:max-h-[70vh] md:max-h-[600px]"
                        />

                        {/* OVERLAY OVAL (Máscara) */}
                        <div className="absolute inset-0 z-10 pointer-events-none">
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div
                                    className="w-[240px] h-[340px] shadow-[0_0_0_9999px_rgba(0,0,0,0.65)] border-4 border-dashed border-emerald-400/80"
                                    style={{ borderRadius: '50% / 40%' }}
                                />
                            </div>
                        </div>

                        {/* Botão Cancelar */}
                        <button
                            onClick={() => setVideoOpen(false)}
                            className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 px-8 py-2 bg-emerald-400 text-white rounded-full font-bold hover:bg-emerald-500 transition-all active:scale-95 shadow-lg cursor-pointer"
                        >
                            Cancelar
                        </button>

                    </div>
                </div>
            )}
            <main className="w-full">
                <div className="grid md:grid-cols-2 gap-1 justify-center md-px-12 px-1 md:py-6 py-2 w-full">
                    <section className="bg-emerald-600 rounded-2xl text-white flex flex-col items-center gap-4 justify-center md:p-12 p-6">
                        <header>
                            <h1>Ponto de Entrada</h1>
                        </header>
                        <main>
                            <Button
                                title={isOutside ? "Aguarde o horário" : "Registrar"}
                                //disabled={isOutside}
                                onClick={() => handleCheckin("ENTRY")}
                            />
                        </main>
                    </section>
                    <section className="bg-emerald-600 rounded-2xl text-white flex flex-col items-center gap-4 justify-center md:p-12 p-6">
                        <header>
                            <h1>Ponto de Almoço</h1>
                        </header>
                        <main>
                            <Button
                                title={isOutside ? "Aguarde o horário" : "Registrar"}
                                // disabled={isOutside}
                                onClick={() => handleCheckin("LUNCH_START")}
                            />
                        </main>
                    </section>
                    <section className="bg-emerald-600 rounded-2xl text-white flex flex-col items-center gap-4 justify-center md:p-12 p-6">
                        <header>
                            <h1>Retorno de Almoço</h1>
                        </header>
                        <main>
                            <Button
                                title={isOutside ? "Aguarde o horário" : "Registrar"}
                                // disabled={isOutside}
                                onClick={() => handleCheckin("LUNCH_END")}
                            />
                        </main>
                    </section>
                    <section className="bg-emerald-600 rounded-2xl text-white flex flex-col items-center gap-4 justify-center md:p-12 p-6">
                        <header>
                            <h1>Ponto de Saída</h1>
                        </header>
                        <main>
                            <Button
                                title={isOutside ? "Aguarde o horário" : "Registrar"}
                                //disabled={isOutside}
                                onClick={() => handleCheckin("EXIT")}
                            />
                        </main>
                    </section>
                </div>
            </main>
        </div>
    )
}