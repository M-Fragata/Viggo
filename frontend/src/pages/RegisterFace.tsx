// src/pages/RegisterFace.tsx
import { FaceAuth } from "../components/FaceAuth";
import { API_URL } from "../utils/api"

export function RegisterFace() {
    const handleSaveFace = async (descriptor: Float32Array) => {
        // Converte para Array normal para enviar via JSON
        const descriptorArray = Array.from(descriptor);

        const userRaw = localStorage.getItem("@viggo:user")
        const tokenRaw = localStorage.getItem("@viggo:token")

        if (!userRaw || !tokenRaw) return window.location.href = "/"

        try {

            const user = JSON.parse(userRaw)
            const token = JSON.parse(tokenRaw)
            
            const response = await fetch(`${API_URL}}/sessions/${user.id}`, {
                method: "PUT",
                headers: { 
                    "Content-type": "application/json",
                    "Authorization": `Bearer ${token}` 
                },
                body: JSON.stringify({ faceDescriptor: descriptorArray })
            })

            if(!response.ok) return alert("Falha na requisição")
    
            user.faceDescriptor = JSON.stringify(descriptorArray)
            localStorage.setItem("@viggo:user", JSON.stringify(user))
            
            alert("Facial registrada com sucesso")

            window.location.href="/"

        } catch (error) {
            console.log(error)
        }

    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
            <h1 className="text-xl font-bold mb-4">Primeiro Acesso: Cadastro Facial</h1>
            <p className="mb-6 text-gray-600">Precisamos registrar seu rosto para garantir a segurança dos seus pontos.</p>
            <FaceAuth onAuthenticate={handleSaveFace} />
        </div>
    );
}