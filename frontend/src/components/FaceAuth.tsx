import * as faceapi from 'face-api.js';
import { useEffect, useRef, useState } from 'react';

export function FaceAuth({ onAuthenticate }: { onAuthenticate: (descriptor: Float32Array) => void }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loadingMessage, setLoadingMessage] = useState('Carregando modelos de IA...');

    useEffect(() => {
        const loadModels = async () => {
            try {
                const MODEL_URL = '/models';
                
                setLoadingMessage('Carregando detector de faces...');
                await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);

                setLoadingMessage('Carregando landmark points...');
                await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);

                setLoadingMessage('Carregando reconhecimento facial...');
                await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);

                setModelsLoaded(true);
            } catch (err) {
                console.error('Erro ao carregar modelos:', err);
                setError('Falha ao carregar modelos de IA. Atualize a página para tentar novamente.');
            }
        };
        loadModels();
    }, []);

    useEffect(() => {
        if (!modelsLoaded) return;

        const startCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: { ideal: 640 },
                        height: { ideal: 480 },
                        facingMode: 'user'
                    }
                });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err) {
                console.error("Erro ao acessar a câmera:", err);
                setError("Câmera não encontrada ou permissão negada. Allow câmera e atualize.");
            }
        };
        startCamera();

        return () => {
            if (videoRef.current && videoRef.current.srcObject) {
                const stream = videoRef.current.srcObject as MediaStream;
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [modelsLoaded]);

    const handleCapture = async () => {
        if (!videoRef.current) {
            alert("Vídeo não disponível");
            return;
        }

        if (videoRef.current.readyState !== 4) {
            alert("Aguarde a câmera inicializar completamente");
            return;
        }

        setError(null);

        const options = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.7 });
        const detection = await faceapi
            .detectSingleFace(videoRef.current, options)
            .withFaceLandmarks()
            .withFaceDescriptor();

        if (detection) {
            onAuthenticate(detection.descriptor);
        } else {
            alert("Rosto não detectado. Posicione seu rosto bem frente à câmera e bem iluminado.");
        }
    };

    return (
        <div className="flex flex-col items-center gap-4">
            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    {error}
                </div>
            )}
            <div className="relative rounded-xl overflow-hidden border-4 border-emerald-500 bg-black">
                <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full max-w-sm"
                />
                {!modelsLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-white p-4 text-center">
                        {loadingMessage}
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