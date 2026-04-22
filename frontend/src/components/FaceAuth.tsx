import * as faceapi from 'face-api.js';
import { useEffect, useRef, useState } from 'react';

export function FaceAuth({ onAuthenticate }: { onAuthenticate: (descriptor: Float32Array) => void }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [modelsLoaded, setModelsLoaded] = useState(false);

    // 1. Efeito para carregar os modelos (Roda uma vez ao montar o componente)
    useEffect(() => {
        const loadModels = async () => {
            const MODEL_URL = `${window.location.origin}/models`;
            await Promise.all([
                faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
            ]);
            setModelsLoaded(true);
        };
        loadModels();
    }, []);

    // 2. Efeito para ligar a câmera (Só roda quando os modelos terminarem de carregar)
    useEffect(() => {
        if (modelsLoaded) {
            navigator.mediaDevices.getUserMedia({ video: true })
                .then(stream => {
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                    }
                })
                .catch(err => {
                    console.error("Erro ao acessar a câmera: ", err);
                    alert("Câmera não encontrada ou permissão negada.");
                });
        }

        // Cleanup: Desliga a câmera quando o usuário sai da página
        return () => {
            if (videoRef.current && videoRef.current.srcObject) {
                const stream = videoRef.current.srcObject as MediaStream;
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [modelsLoaded]);

    const handleCapture = async () => {
        if (videoRef.current) {
            const detection = await faceapi
                .detectSingleFace(videoRef.current)
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (detection) {
                onAuthenticate(detection.descriptor);
            } else {
                alert("Rosto não detectado. Tente iluminar melhor o ambiente.");
            }
        }
    };

    return (
        <div className="flex flex-col items-center gap-4">
            <div className="relative rounded-xl overflow-hidden border-4 border-emerald-500 bg-black">
                <video 
                    ref={videoRef} 
                    autoPlay 
                    muted 
                    playsInline 
                    className="w-full max-w-sm" 
                />
                {!modelsLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
                        Carregando IA...
                    </div>
                )}
            </div>
            
            <button
                disabled={!modelsLoaded}
                onClick={handleCapture}
                className="bg-emerald-600 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-bold shadow-lg transition-all active:scale-95"
            >
                {modelsLoaded ? "Capturar Biometria" : "Aguarde..."}
            </button>
        </div>
    );
}