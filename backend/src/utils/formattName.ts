export function FormattName(name: string): string {
    const nameUser: string = name.split(" ").map((nome) => {
        const name = nome.toLowerCase()

        const conectivos = ["de", "da", "do", "dos", "das", "e"]

        if (conectivos.includes(name)) return name

        const firstName = name.slice(0, 1)
        const restName = name.slice(1)
        return `${firstName.toUpperCase()}${restName}`
    }).join(" ")

    return nameUser
}