import { useState, useEffect, useCallback } from 'react';
import { useHeadPose, calculateEAR, BLINK_THRESHOLD_FRONT, YAW_THRESHOLD_FRONT, YAW_THRESHOLD_SIDE } from '../hooks/useHeadPose';
import type { HeadPose } from '../hooks/useHeadPose';
import * as faceapi from 'face-api.js';

type LivenessStep = 'front' | 'left' | 'right' | 'complete';

interface LivenessChallengeProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onComplete: (bestFrameDescriptor: Float32Array) => void;
  onCancel: () => void;
  faceDescriptor?: Float32Array;
}

const STEP_CONFIG: Record<Exclude<LivenessStep, 'complete'>, { label: string; instruction: string; icon: string; color: string }> = {
  front: {
    label: 'Olhe para frente',
    instruction: 'Mantenha o rosto centralizado',
    icon: '👁️',
    color: 'bg-emerald-500',
  },
  left: {
    label: 'Vire para a esquerda',
    instruction: 'Devagar, até o limite confortável',
    icon: '◀️',
    color: 'bg-blue-500',
  },
  right: {
    label: 'Vire para a direita',
    instruction: 'Devagar, até o limite confortável',
    icon: '▶️',
    color: 'bg-blue-500',
  },
};

const STEPS: Exclude<LivenessStep, 'complete'>[] = ['front', 'left', 'right'];

export function LivenessChallenge({ 
  videoRef, 
  onComplete, 
  onCancel,
  faceDescriptor 
}: LivenessChallengeProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [pose, setPose] = useState<HeadPose>({ yaw: 0, pitch: 0, roll: 0 });
  const [progress, setProgress] = useState(0);
  const [blinkValidated, setBlinkValidated] = useState(false);
  const [frontStepStartTime, setFrontStepStartTime] = useState(Date.now());
  const [lastIncrementTime, setLastIncrementTime] = useState(Date.now());
  const [message, setMessage] = useState('Iniciando validação...');
  const [bestFrameDescriptor, setBestFrameDescriptor] = useState<Float32Array | null>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);

  const { getHeadPose, isLookingFront, isLookingLeft, isLookingRight } = useHeadPose();

  const currentStep = STEPS[currentStepIndex];
  const stepConfig = STEP_CONFIG[currentStep];

  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = '/models';
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        setModelsLoaded(true);
      } catch (err) {
        console.error('Erro ao carregar modelos:', err);
        setMessage('Erro ao carregar modelos. Atualize a página.');
      }
    };
    loadModels();
  }, []);

  // Reset blink state when step changes
  useEffect(() => {
    setBlinkValidated(false);
    setFrontStepStartTime(Date.now());
    setLastIncrementTime(Date.now());
    if (modelsLoaded) {
      setMessage(stepConfig.instruction);
      setProgress(0);
    }
  }, [currentStepIndex, modelsLoaded, stepConfig.instruction]);

  const checkPose = useCallback(async () => {
    if (!videoRef.current || !modelsLoaded || videoRef.current.readyState !== 4) {
      return;
    }

    try {
      const detectorOptions = new faceapi.TinyFaceDetectorOptions({ 
        inputSize: 320, 
        scoreThreshold: 0.5 
      });

      const detection = await faceapi
        .detectSingleFace(videoRef.current, detectorOptions)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detection) {
        const headPose = getHeadPose(detection.landmarks);
        setPose(headPose);

        const ear = calculateEAR(detection.landmarks);

        let stepPassed = false;

        if (currentStep === 'front') {
          // Front step: pose + blink validation (threshold 0.30)
          const poseOk = isLookingFront(headPose, YAW_THRESHOLD_FRONT);
          const blinked = ear < BLINK_THRESHOLD_FRONT; // 0.30 - mais tolerante
          const timeInFront = Date.now() - frontStepStartTime;

          if (blinked) {
            setBlinkValidated(true);
          }

          // Front step passes if: pose OK + (blink validated OR 10s timeout)
          stepPassed = poseOk && (blinkValidated || timeInFront > 10000);
        } else {
          // Left/Right steps: ONLY head pose (no blink required)
          stepPassed = currentStep === 'left' 
            ? isLookingLeft(headPose, YAW_THRESHOLD_SIDE)
            : isLookingRight(headPose, YAW_THRESHOLD_SIDE);
        }

        if (stepPassed) {
          // Increment: +25% on valid frame
          setProgress(prev => Math.min(100, prev + 25));
          setLastIncrementTime(Date.now());
          
          if (progress >= 80) {
            if (faceDescriptor) {
              const distance = faceapi.euclideanDistance(detection.descriptor, faceDescriptor);
              if (distance < 0.5) {
                setBestFrameDescriptor(detection.descriptor);
              }
            } else {
              setBestFrameDescriptor(detection.descriptor);
            }

            if (currentStepIndex < STEPS.length - 1) {
              setCurrentStepIndex(prev => prev + 1);
              setProgress(0);
              // Message will be set by the step change useEffect
            } else {
              setMessage('Validação concluída!');
              setTimeout(() => {
                if (bestFrameDescriptor) {
                  onComplete(bestFrameDescriptor);
                }
              }, 500);
            }
          }
        } else {
          // Decay: Only on front step, linear -5% after 4 seconds of no increment
          if (currentStep === 'front') {
            const timeSinceIncrement = Date.now() - lastIncrementTime;
            if (timeSinceIncrement > 4000) {
              setProgress(prev => Math.max(0, prev - 5));
            }
          }
        }

        const yawDeg = Math.round(headPose.yaw);
        
        if (!stepPassed) {
          if (currentStep === 'front') {
            setMessage(`Centralize o rosto (Yaw: ${yawDeg}°)`);
          } else if (currentStep === 'left') {
            setMessage(`Vire mais para a esquerda (Yaw: ${yawDeg}°)`);
          } else if (currentStep === 'right') {
            setMessage(`Vire mais para a direita (Yaw: ${yawDeg}°)`);
          }
        }
      } else {
        setMessage('Rosto não detectado. Posicione-se frente à câmera.');
        setProgress(0);
      }
    } catch (err) {
      console.error('Erro na detecção:', err);
    }
  }, [
    videoRef, 
    modelsLoaded, 
    currentStep, 
    currentStepIndex, 
    progress, 
    blinkValidated,
    frontStepStartTime,
    lastIncrementTime,
    faceDescriptor,
    getHeadPose,
    isLookingFront,
    isLookingLeft,
    isLookingRight,
    onComplete,
    bestFrameDescriptor
  ]);

  useEffect(() => {
    if (!modelsLoaded) return;

    const interval = setInterval(checkPose, 100);

    return () => {
      clearInterval(interval);
    };
  }, [modelsLoaded, checkPose]);

  if (!modelsLoaded) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent mx-auto mb-4" />
          <p>Carregando modelos de validação...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-20 pointer-events-none flex flex-col items-center justify-between p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{stepConfig.icon}</span>
            <div>
              <p className="text-white font-bold text-lg">{stepConfig.label}</p>
              <p className="text-emerald-300 text-sm">{stepConfig.instruction}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {STEPS.map((step, idx) => (
              <div
                key={step}
                className={`w-8 h-2 rounded transition-colors ${
                  idx < currentStepIndex 
                    ? 'bg-emerald-500' 
                    : idx === currentStepIndex 
                    ? 'bg-yellow-500' 
                    : 'bg-white/30'
                }`}
              />
            ))}
          </div>
        </div>
        
        <div className="w-full h-2 bg-white/20 rounded overflow-hidden">
          <div
            className={`h-full ${stepConfig.color} transition-all duration-300`}
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className="text-white text-center mt-2 text-sm">{message}</p>
      </div>

      <div className="flex items-center gap-3 mb-8 px-4">
        {currentStep === 'front' && (
          <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center ${
            blinkValidated ? 'border-emerald-500 bg-emerald-500/20' : 'border-white/30'
          }`}>
            <span className="text-white text-lg">{blinkValidated ? '✓' : '👁'}</span>
          </div>
        )}
        {currentStep === 'front' && (
          <span className="text-white text-sm">Pisque para confirmar</span>
        )}
        
        <div className="ml-auto flex items-center gap-2">
          <span className="text-white/70 text-xs font-mono">
            Yaw: {Math.round(pose.yaw)}°
          </span>
          <span className="text-white/70 text-xs font-mono">
            Pitch: {Math.round(pose.pitch)}°
          </span>
        </div>
      </div>

      <button
        onClick={onCancel}
        className="w-full max-w-[200px] py-3 bg-white/10 hover:bg-white/20 text-white rounded-full font-bold transition-all active:scale-95 pointer-events-auto"
      >
        Cancelar
      </button>
    </div>
  );
}