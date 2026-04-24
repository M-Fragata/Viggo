import { useEffect, useState } from "react"

import { API_URL } from "../utils/api"

import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { MapPin, Calendar } from "lucide-react"

type Checkin = {
    id: string;
    createdAt: string;
    type: string;
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
            setEmployees(data)
            console.log(data)
        } catch (error) {
            console.error("Error fetching employees:", error)
        }
    }

    const format = (datehour: string) => {

        const [date, hour] = datehour.replace("Z", "").split("T")

        const dateObj = new Date(date)
        const day = String(dateObj.getDate()).padStart(2, '0')
        const month = String(dateObj.getMonth() + 1).padStart(2, '0')
        const year = dateObj.getFullYear()

        return `${day}/${month}/${year} ${hour}`
    }

    useEffect(() => {
        handleGetFuncionarios()
    }, [date])

    return (
        <div>
            <header>
                <h1>Dashboard</h1>
                <Calendar className="text-emerald-600 " size={20} />
                <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="bg-transparent border-none focus:ring-0 text-gray-700 font-medium w-full"
                />
            </header>
            <main className="w-full">
                <div className="flex gap-4 w-full bg-emerald-600 p-4 mb-2 justify-around">

                    <Button
                        title={`Funcionários: ${employees.length}`}
                        onClick={() => setDashboardNav("Funcionários")}
                    />
                    <Button
                        title={`Presentes:`}
                        onClick={() => setDashboardNav("Presentes")}
                    />
                    <Button
                        title={`Inconsistências:`}
                        onClick={() => setDashboardNav("Inconsistências")}
                    />

                </div>
                {dashboardNav === "Funcionários" && employees.map((employee: Employee) => (
                    <section>
                        <div
                            className="flex gap-2"
                            key={employee.id}>
                            <h3>{employee.name}</h3>
                            <p>{employee.email}</p>
                            {employee.checkins && employee.checkins.length > 0 && (
                                <div className="flex gap-2">
                                    <h4>Check-ins:</h4>
                                    {employee.checkins.map((checkin: Checkin) => (
                                        <div>
                                            <div>
                                                <h2>{checkin.type}</h2>
                                                <p key={checkin.id}>{format(checkin.createdAt)}</p>
                                            </div>
                                            <a className="flex items-center gap-1 text-gray-400 text-xs"
                                                href={`https://www.google.com/maps/search/?api=1&query=${checkin.latitude},${checkin.longitude}`} target="_blank" rel="noopener noreferrer">
                                                <MapPin size={12} />
                                                <Button
                                                    title="Ver no mapa"
                                                    className="hover:text-emerald-600 cursor-pointer"
                                                />
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </section>
                ))}
                {dashboardNav === "Presentes" && <p>Presentes</p>}
                {dashboardNav === "Inconsistências" && <p>Inconsistências</p>}
            </main>
        </div>
    )
}