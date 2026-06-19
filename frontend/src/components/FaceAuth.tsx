import * as faceapi from 'face-api.js';
import { useEffect, useRef, useState, useCallback } from 'react';
import * as tf from '@tensorflow/tfjs';

export function FaceAuth({ onAuthenticate }: { onAuthenticate: (descriptor: Float32Array) => void }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [isLoadingModels, setIsLoadingModels] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loadingMessage, setLoadingMessage] = useState('');

    useEffect(() => {
        tf.setBackend('webgl').then(() => tf.ready());
    }, []);

    const loadModels = useCallback(async () => {
        if (modelsLoaded || isLoadingModels) return;
        
        setIsLoadingModels(true);
        setError(null);
        
        try {
            const MODEL_URL = '/models';
            
            setLoadingMessage('Preparando câmera...');
            await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);

            setLoadingMessage('Carregando pontos de referência...');
            await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);

            setLoadingMessage('Finalizando...');
            await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);

            setModelsLoaded(true);
        } catch (err) {
            console.error('Erro ao carregar modelos:', err);
            setError('Falha ao preparar validação facial. Tente novamente.');
        } finally {
            setIsLoadingModels(false);
            setLoadingMessage('');
        }
    }, [modelsLoaded, isLoadingModels]);

    useEffect(() => {
        const startCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: { ideal: 320 },
                        height: { ideal: 240 },
                        facingMode: 'user'
                    }
                });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err) {
                console.error("Erro ao acessar a câmera:", err);
                setError("Câmera não encontrada ou permissão negada. Permita câmera e atualize.");
            }
        };
        startCamera();

        return () => {
            if (videoRef.current && videoRef.current.srcObject) {
                const stream = videoRef.current.srcObject as MediaStream;
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const handleCapture = async () => {
        if (!videoRef.current) {
            return;
        }

        if (videoRef.current.readyState !== 4) {
            return;
        }

        await loadModels();

        if (!modelsLoaded) {
            return;
        }

        setError(null);

        const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });
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
                {(isLoadingModels || !modelsLoaded) && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-white p-4 text-center">
                        {loadingMessage || 'Iniciando...'}
                    </div>
                )}
            </div>

            <button
                disabled={isLoadingModels}
                onClick={handleCapture}
                className="bg-emerald-600 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-bold shadow-lg transition-all active:scale-95"
            >
                {isLoadingModels ? loadingMessage : modelsLoaded ? "Capturar Biometria" : "Iniciar Validação"}
            </button>
        </div>
    );
}