import { useState, useEffect } from "react"

import { z } from "zod"
import { Button } from "../components/Button"

export function PontoPage() {

    const [hour, setHour] = useState(new Date().toLocaleTimeString())

    const getStatusMessage = () => {
        if (hour >= "07:50:00" && hour <= "08:20:00") return "Ponto de entrada"
        if (hour >= "11:50:00" && hour <= "12:20:00") return "Ponto de entrada de almoço"
        if (hour >= "12:40:00" && hour <= "13:20:00") return "Ponto de retorno de almoço"
        if (hour >= "17:50:00" && hour <= "18:00:00") return "Ponto de saída"
        return "Fora do horário de bater ponto"
    }

    const status = getStatusMessage();
    const isOutside = status === "Fora do horário de bater ponto";

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
                console.log("Ponto registrado com sucesso:", data);
                alert("Ponto registrado com sucesso!");

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


    useEffect(() => {
        const timer = setInterval(() => {
            setHour(new Date().toLocaleTimeString())
        }, 1000)

        return () => clearInterval(timer)
    }, [])

    return (
        <div>
            <header className="flex gap-2 justify-center p-6 border rounded-lg">
                <h1>Ponto Page</h1>
                <p>Horário: {hour}</p>
            </header>
            <main>
                <div className="grid grid-cols-2 gap-2 justify-center px-12 py-6">
                    <section className="bg-emerald-600 rounded-2xl text-white flex flex-col items-center gap-4 justify-center p-12">
                        <header>
                            <h1>Ponto de Entrada</h1>
                        </header>
                        <main>
                            <Button
                                title={isOutside ? "Aguarde o horário" : "Registrar Agora"}
                                //disabled={isOutside}
                                onClick={() => handleCheckin("ENTRY")}
                            />
                        </main>
                    </section>
                    <section className="bg-emerald-600 rounded-2xl text-white flex flex-col items-center gap-4 justify-center p-12">
                        <header>
                            <h1>Ponto de Almoço</h1>
                        </header>
                        <main>
                            <Button
                                title={isOutside ? "Aguarde o horário" : "Registrar Agora"}
                                // disabled={isOutside}
                                onClick={() => handleCheckin("LUNCH_START")}
                            />
                        </main>
                    </section>
                    <section className="bg-emerald-600 rounded-2xl text-white flex flex-col items-center gap-4 justify-center p-12">
                        <header>
                            <h1>Retorno de Almoço</h1>
                        </header>
                        <main>
                            <Button
                                title={isOutside ? "Aguarde o horário" : "Registrar Agora"}
                                // disabled={isOutside}
                                onClick={() => handleCheckin("LUNCH_END")}
                            />
                        </main>
                    </section>
                    <section className="bg-emerald-600 rounded-2xl text-white flex flex-col items-center gap-4 justify-center p-12">
                        <header>
                            <h1>Ponto de Saída</h1>
                        </header>
                        <main>
                            <Button
                                title={isOutside ? "Aguarde o horário" : "Registrar Agora"}
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