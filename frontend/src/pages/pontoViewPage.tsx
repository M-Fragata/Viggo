import { useState, useEffect, useMemo } from "react"
import { Input } from "../components/Input"
import { Button } from "../components/Button"
import { Clock, MapPin, Calendar } from "lucide-react"

export function PontoViewPage() {
    const [date, setDate] = useState(new Date().toISOString().split("T")[0])
    const [checkins, setCheckins] = useState<any[]>([])

    async function handleGetPontos() {

        const token = localStorage.getItem("@viggo:token")

        try {

            if (!token) return window.location.href = "/"

            const response = await fetch(`http://localhost:3333/checkins?date=${date}`, {
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
            setCheckins(data)

        } catch (error) {
            console.error("Erro ao buscar os pontos:", error);
            alert("Erro ao buscar os pontos. Tente novamente.");
        }

    }

    const formatType = (type: string) => {
        const labels: Record<string, string> = {
            "ENTRY": "Entrada",
            "LUNCH_START": "Saída Almoço",
            "LUNCH_END": "Retorno Almoço",
            "EXIT": "Saída"
        }
        return labels[type] || type;
    }

    const formatTime = (isoString: string) => {
        return new Date(isoString).toLocaleTimeString('pt-BR', {
            hour: '2-digit',
            minute: '2-digit',
        })
    }

    const horasTrabalhadas = useMemo(() => {
        if (checkins.length < 2) return "0:00h"

        const index = checkins.length - 1
        const initial = checkins[0].createdAt
        const final = checkins[index].createdAt

        const diff = new Date(final).getTime() - new Date(initial).getTime()

        const hours = Math.floor(diff / (1000 * 60 * 60))
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

        const h = String(hours).padStart(2, "0")
        const m = String(minutes).padStart(2, "0")

        return `${h}:${m}h`

    }, [checkins])

    useEffect(() => {
        handleGetPontos()
    }, [date])

    return (
        <div className="max-w-4xl mx-auto flex flex-col gap-6">
            {/* Seção de Filtro */}
            <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Meu Histórico</h1>
                    <p className="text-gray-500">Visualize seus registros diários</p>
                </div>
                <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-lg border">
                    <Calendar className="text-emerald-600 " size={20} />
                    <Input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="bg-transparent border-none focus:ring-0 text-gray-700 font-medium"
                    />
                </div>
            </section>

            {/* Conteúdo Principal */}
            <main className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Coluna da Esquerda: Timeline de Pontos */}
                <div className="md:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                        <Clock size={18} className="text-emerald-600" />
                        Linha do tempo
                    </h2>

                    {checkins.length === 0 ? (
                        <div className="py-12 text-center text-gray-400">
                            Nenhum ponto registrado nesta data.
                        </div>
                    ) : (
                        <div className="relative border-l-2 border-blue-100 ml-4 pl-8 space-y-8">
                            {checkins.map((ponto) => (
                                <div key={ponto.id} className="relative">
                                    {/* Bolinha da Timeline */}
                                    <div className="absolute -left-[41px] top-1 w-4 h-4 rounded-full border-2 border-emerald-600 bg-white" />

                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-bold text-gray-800 text-lg">
                                                {formatTime(ponto.createdAt)}
                                            </p>
                                            <p className="text-sm text-emerald-600  font-medium uppercase tracking-wider">
                                                {formatType(ponto.type)}
                                            </p>
                                        </div>
                                        <div>
                                            <a className="flex items-center gap-1 text-gray-400 text-xs"
                                                href={`https://www.google.com/maps/search/?api=1&query=${ponto.latitude},${ponto.longitude}`} target="_blank" rel="noopener noreferrer">
                                                <MapPin size={12} />
                                                <Button
                                                    title="Ver no mapa"
                                                    className="hover:text-emerald-600 cursor-pointer" />
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Coluna da Direita: Resumo/Cards Extras */}
                <div className="flex flex-col gap-6">
                    <div className="bg-emerald-600 p-6 rounded-xl text-white shadow-md shadow-emerald-100">
                        <h3 className="text-emerald-100 text-sm font-medium mb-1">Total de Horas</h3>
                        <p className="text-3xl font-bold">{horasTrabalhadas}</p>
                        <div className="mt-4 pt-4 border-t border-emerald-500 text-xs text-emerald-100">
                            Cálculo baseado no primeiro e último registro.
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                        <h3 className="text-gray-800 font-semibold mb-3 text-sm">Status do Dia</h3>
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase">
                            Completo
                        </span>
                    </div>
                </div>
            </main>
        </div>
    )
}