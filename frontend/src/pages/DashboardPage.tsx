import { useEffect, useState } from "react"
import { API_URL } from "../utils/api"
import { Input } from "../components/Input"
import { MapPin, Calendar, Users, CheckCircle, Search, LayoutList } from "lucide-react"

type Checkin = {
    id: string;
    createdAt: string;
    type: "ENTRY" | "LUNCH_START" | "LUNCH_END" | "EXIT" | string;
    latitude: number;
    longitude: number;
    userId: string;
    address: string;
    companyId: string;
}

type Employee = {
    companyId: string;
    created_at: string;
    id: string;
    name: string;
    email: string;
    checkins: Checkin[];
    role: string;
    faceDescriptor: string;
}

export function DashboardPage() {
    const [employees, setEmployees] = useState<Employee[]>([])
    const [dashboardNav, setDashboardNav] = useState("Funcionários")
    const [date, setDate] = useState(new Date().toISOString().split("T")[0])

    async function handleGetFuncionarios() {
        const token = localStorage.getItem("@viggo:token")
        if (!token) return window.location.href = "/"

        try {
            const response = await fetch(`${API_URL}/employees?date=${date}`, {
                method: "GET",
                headers: {
                    "Content-type": "application/json",
                    "Authorization": `Bearer ${JSON.parse(token)}`
                }
            })
            const data = await response.json()
            console.log(data)
            setEmployees(data)
        } catch (error) {
            console.error("Error fetching employees:", error)
        }
    }

    // Filtra apenas funcionários que têm checkins no dia para alimentar a aba "Presentes"
    const presentEmployees = employees.filter(emp => emp.checkins && emp.checkins.length > 0)

    // Formata o timestamp ISO para exibir apenas o horário (HH:MM) de forma limpa na tabela
    const formatTime = (datehour: string) => {
        const [, hour] = datehour.replace("Z", "").split("T")
        if (!hour) return "--:--"
        const [hh, mm] = hour.split(":")
        return `${hh}:${mm}`
    }

    // Helper para buscar uma batida específica do funcionário na lista do dia
    const getCheckinByType = (checkins: Checkin[], type: string) => {
        return checkins.find(c => c.type === type)
    }

    useEffect(() => {
        handleGetFuncionarios()
    }, [date])

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 overflow-x-hidden"> {/* Container principal - evita scroll horizontal na página */}

            {/* TOPO COM FILTRO DE DATA E BUSCA */}
            <header className="flex flex-col gap-4 bg-white p-4 sm:p-6 rounded-3xl border border-slate-200 shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Painel de Controle</h1>
                        <p className="text-xs sm:text-sm text-slate-400">Gerenciamento de frequência e auditoria biométrica</p>
                    </div>

                    <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 px-4 py-2 rounded-2xl w-full sm:w-auto">
                        <Calendar className="text-emerald-600 shrink-0" size={20} />
                        <Input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="bg-transparent border-none focus:ring-0 text-slate-700 font-medium p-0 w-full"
                        />
                    </div>
                </div>

                <div className="flex gap-2 w-full items-center bg-slate-50 border border-slate-200 px-4 py-1.5 rounded-2xl focus-within:border-emerald-500 transition-colors">
                    <Search className="text-emerald-600 shrink-0" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar funcionário..."
                        className="bg-transparent border-none w-full focus:outline-none focus:ring-0 text-slate-700 text-sm font-medium p-1.5"
                    />
                </div>
            </header>

            {/* ABAS DE NAVEGAÇÃO SUB-MENU */}
            <main className="w-full space-y-4"> {/* Garante que o conteúdo interno respeite os limites */}

                {/* Ajuste de flex-wrap e quebra de linha nas abas para não empurrar a tela para o lado */}
                <div className="flex flex-col sm:flex-row gap-2 bg-slate-100 p-1.5 rounded-2xl w-full">
                    <button
                        onClick={() => setDashboardNav("Funcionários")}
                        className={`flex items-center justify-start gap-2 px-4 py-3 rounded-xl font-bold text-sm transition-all cursor-pointer w-full sm:w-auto ${dashboardNav === "Funcionários" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                    >
                        <Users size={18} className="shrink-0" />
                        <span className="truncate">Funcionários ({employees.length})</span>
                    </button>
                    <button
                        onClick={() => setDashboardNav("Presentes")}
                        className={`flex items-center justify-start gap-2 px-4 py-3 rounded-xl font-bold text-sm transition-all cursor-pointer w-full sm:w-auto ${dashboardNav === "Presentes" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                    >
                        <CheckCircle size={18} className="shrink-0" />
                        <span className="truncate">Presentes Hoje ({presentEmployees.length})</span>
                    </button>
                    <button
                        onClick={() => setDashboardNav("Total")}
                        className={`flex items-center justify-start gap-2 px-4 py-3 rounded-xl font-bold text-sm transition-all cursor-pointer w-full sm:w-auto ${dashboardNav === "Total" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                    >
                        <LayoutList size={18} className="shrink-0" />
                        <span className="truncate">Presentes Total</span>
                    </button>
                </div>

                {/* ABA 1: LISTA DE FUNCIONÁRIOS */}
                {dashboardNav === "Funcionários" && (
                    <div className="w-full max-w-full min-w-0 bg-white border border-slate-200 rounded-3xl shadow-sm">
                        <div className="w-full max-w-full overflow-x-auto rounded-3xl">{/* Rolagem horizontal apenas na tabela */}
                            <table className="w-full text-left border-collapse min-w-[700px] table-fixed">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider">
                                        <th className="p-4 sm:p-5 w-[30%] min-w-[150px]">Nome</th>
                                        <th className="p-4 sm:p-5 w-[35%] min-w-[180px]">E-mail</th>
                                        <th className="p-4 sm:p-5 w-[15%] min-w-[100px]">Cargo</th>
                                        <th className="p-4 sm:p-5 w-[20%] min-w-[120px]">ID Interno</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
                                    {employees.map((employee) => (
                                        <tr key={employee.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="p-4 sm:p-5 font-semibold text-slate-800 whitespace-normal break-words">{employee.name}</td>
                                            <td className="p-4 sm:p-5 text-slate-500 whitespace-normal break-all">{employee.email}</td>
                                            <td className="p-4 sm:p-5">
                                                <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
                                                    {employee.role}
                                                </span>
                                            </td>
                                            <td className="p-4 sm:p-5 text-xs font-mono text-slate-400 truncate">{employee.id}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ABA 2: LISTA DE PRESENTES DO DIA */}
                {dashboardNav === "Presentes" && (
                    <div className="w-full max-w-full min-w-0 bg-white border border-slate-200 rounded-3xl shadow-sm">
                        <div className="w-full max-w-full overflow-x-auto rounded-3xl">{/* Rolagem horizontal apenas na tabela */}
                            <table className="w-full text-left border-collapse min-w-[800px] table-fixed">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider">
                                        <th className="p-4 sm:p-5 w-[30%] min-w-[180px] sticky left-0 bg-slate-50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">Funcionário</th>
                                        <th className="p-4 sm:p-5 text-center w-[17.5%]">Entrada</th>
                                        <th className="p-4 sm:p-5 text-center w-[17.5%]">Almoço (Ida)</th>
                                        <th className="p-4 sm:p-5 text-center w-[17.5%]">Almoço (Volta)</th>
                                        <th className="p-4 sm:p-5 text-center w-[17.5%]">Saída</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
                                    {presentEmployees.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="p-8 text-center text-slate-400">
                                                Nenhum ponto registrado na data selecionada.
                                            </td>
                                        </tr>
                                    ) : (
                                        presentEmployees.map((employee) => {
                                            const pointTypes = ["ENTRY", "LUNCH_START", "LUNCH_END", "EXIT"];

                                            return (
                                                <tr key={employee.id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="p-4 sm:p-5 font-semibold text-slate-800 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] whitespace-normal">
                                                        <div className="break-words">{employee.name}</div>
                                                        <span className="block text-xs font-normal text-slate-400 mt-0.5 break-all whitespace-normal">{employee.email}</span>
                                                    </td>

                                                    {pointTypes.map((type) => {
                                                        const checkin = getCheckinByType(employee.checkins, type);

                                                        return (
                                                            <td key={type} className="p-4 sm:p-5 text-center">
                                                                {checkin ? (
                                                                    <div className="flex flex-col items-center justify-center gap-1">
                                                                        <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-xl text-xs sm:text-sm">
                                                                            {formatTime(checkin.createdAt)}
                                                                        </span>
                                                                        <a
                                                                            href={`https://www.google.com/maps/search/?api=1&query=latitude,longitude0{checkin.latitude},${checkin.longitude}`}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="flex items-center gap-0.5 text-xs text-emerald-600 hover:text-emerald-700 font-semibold transition-colors py-0.5"
                                                                        >
                                                                            <MapPin size={12} />
                                                                            <span>Ver mapa</span>
                                                                        </a>
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-slate-300 font-mono text-sm">--:--</span>
                                                                )}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ABA 3: PRESENTES TOTAL */}
                {dashboardNav === "Total" && (
                    <div className="w-full max-w-full min-w-0 bg-white border border-slate-200 rounded-3xl shadow-sm">
                        <div className="w-full max-w-full overflow-x-auto rounded-3xl">{/* Rolagem horizontal apenas na tabela */}
                            <table className="w-full text-left border-collapse min-w-[800px] table-fixed">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider">
                                        <th className="p-4 sm:p-5 w-[30%] min-w-[180px] sticky left-0 bg-slate-50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">Funcionário</th>
                                        <th className="p-4 sm:p-5 text-center w-[17.5%]">Entrada</th>
                                        <th className="p-4 sm:p-5 text-center w-[17.5%]">Almoço (Ida)</th>
                                        <th className="p-4 sm:p-5 text-center w-[17.5%]">Almoço (Volta)</th>
                                        <th className="p-4 sm:p-5 text-center w-[17.5%]">Saída</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
                                    {presentEmployees.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="p-8 text-center text-slate-400">
                                                Nenhum ponto registrado na data selecionada.
                                            </td>
                                        </tr>
                                    ) : (
                                        presentEmployees.map((employee) => {
                                            const pointTypes = ["ENTRY", "LUNCH_START", "LUNCH_END", "EXIT"];

                                            return (
                                                <tr key={employee.id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="p-4 sm:p-5 font-semibold text-slate-800 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] whitespace-normal">
                                                        <div className="break-words">{employee.name}</div>
                                                        <span className="block text-xs font-normal text-slate-400 mt-0.5 break-all whitespace-normal">{employee.email}</span>
                                                    </td>

                                                    {pointTypes.map((type) => {
                                                        const checkin = getCheckinByType(employee.checkins, type);

                                                        return (
                                                            <td key={type} className="p-4 sm:p-5 text-center">
                                                                {checkin ? (
                                                                    <div className="flex flex-col items-center justify-center gap-1">
                                                                        <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-xl text-xs sm:text-sm">
                                                                            {formatTime(checkin.createdAt)}
                                                                        </span>
                                                                        <a
                                                                            href={`https://www.google.com/maps/search/?api=1&query=latitude,longitude1{checkin.latitude},${checkin.longitude}`}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="flex items-center gap-0.5 text-xs text-emerald-600 hover:text-emerald-700 font-semibold transition-colors py-0.5"
                                                                        >
                                                                            <MapPin size={12} />
                                                                            <span>Ver mapa</span>
                                                                        </a>
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-slate-300 font-mono text-sm">--:--</span>
                                                                )}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>
        </div>
    )
}