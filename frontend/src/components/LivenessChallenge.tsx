import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { useHeadPose, calculateEAR, BLINK_THRESHOLD_FRONT, YAW_THRESHOLD_FRONT, YAW_THRESHOLD_SIDE, FRONT_TIMEOUT_MS } from '../hooks/useHeadPose';
import type { HeadPose } from '../hooks/useHeadPose';
import * as faceapi from 'face-api.js';
import { motion, useMotionValue, useSpring, useTransform, animate } from 'framer-motion';

type LivenessStep = 'front' | 'left' | 'right' | 'complete';

interface LivenessChallengeProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onComplete: (bestFrameDescriptor: Float32Array) => void;
  onCancel: () => void;
  faceDescriptor?: Float32Array;
}

const STEP_CONFIG: Record<Exclude<LivenessStep, 'complete'>, { 
  label: string; 
  instruction: string; 
  icon: string; 
  color: string; 
  targetX: number;
  targetY: number;
  requiresBlink: boolean;
  threshold: number;
}> = {
  front: {
    label: 'Olhe para frente',
    instruction: 'Centralize o rosto no círculo',
    icon: '👁️',
    color: 'emerald',
    targetX: 0,
    targetY: 0,
    requiresBlink: true,
    threshold: 25,
  },
  left: {
    label: 'Vire para a esquerda',
    instruction: 'Vire o rosto até a bola chegar ao alvo (≈25°)',
    icon: '◀️',
    color: 'blue',
    targetX: -1,
    targetY: 0,
    requiresBlink: false,
    threshold: 25,
  },
  right: {
    label: 'Vire para a direita',
    instruction: 'Vire o rosto até a bola chegar ao alvo (≈25°)',
    icon: '▶️',
    color: 'blue',
    targetX: 1,
    targetY: 0,
    requiresBlink: false,
    threshold: 25,
  },
};

const STEPS: Exclude<LivenessStep, 'complete'>[] = ['front', 'left', 'right'];

const RING_RADIUS = 54;
const RING_STROKE = 6;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function BallVisual({
  ballXPercent,
  ballYPercent,
  ringOffset,
  isCorrectPose,
  targetX,
  targetY,
}: {
  ballXPercent: import('framer-motion').MotionValue<string>;
  ballYPercent: import('framer-motion').MotionValue<string>;
  ringOffset: import('framer-motion').MotionValue<number>;
  isCorrectPose: boolean;
  targetX: number;
  targetY: number;
}) {
  const targetXPercent = `${targetX * 80}%`;
  const targetYPercent = `${targetY * 80}%`;

  return (
    <motion.div className="relative w-28 h-28 flex items-center justify-center">
      <svg width="120" height="120" viewBox="0 0 120 120" className="transform -rotate-90">
        <circle
          cx="60"
          cy="60"
          r={RING_RADIUS}
          fill="none"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth={RING_STROKE}
        />
        <motion.circle
          cx="60"
          cy="60"
          r={RING_RADIUS}
          fill="none"
          stroke={isCorrectPose ? '#10b981' : '#ef4444'}
          strokeWidth={RING_STROKE}
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          style={{ strokeDashoffset: ringOffset }}
        />
      </svg>
      {/* Target marker - shows where user should look */}
      <motion.div
        className="absolute w-10 h-10 rounded-full border-2 border-dashed"
        style={{
          x: targetXPercent,
          y: targetYPercent,
          borderColor: isCorrectPose ? '#10b981' : '#fbbf24',
          backgroundColor: 'transparent',
        }}
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
      {/* Actual head position ball */}
      <motion.div
        className="absolute w-10 h-10 rounded-full shadow-lg"
        style={{
          x: ballXPercent,
          y: ballYPercent,
          backgroundColor: isCorrectPose ? '#10b981' : '#f87171',
        }}
        animate={isCorrectPose ? { boxShadow: '0 0 20px rgba(16, 185, 129, 0.5)' } : { boxShadow: '0 0 8px rgba(248, 113, 113, 0.3)' }}
      />
      {isCorrectPose && (
        <motion.div
          className="absolute w-2.5 h-2.5 rounded-full bg-white/20 border border-white/30"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0 }}
        />
      )}
    </motion.div>
  );
}

export function LivenessChallenge({ 
  videoRef, 
  onComplete, 
  onCancel,
  faceDescriptor 
}: LivenessChallengeProps) {
  const animationRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [pose, setPose] = useState<HeadPose>({ yaw: 0, pitch: 0, roll: 0 });
  const [progress, setProgress] = useState(0);
  const [blinkValidated, setBlinkValidated] = useState(false);
  const [frontStepStartTime, setFrontStepStartTime] = useState(() => Date.now());
  const [lastIncrementTime, setLastIncrementTime] = useState(() => Date.now());
  const [message, setMessage] = useState('Iniciando validação...');
  const [bestFrameDescriptor, setBestFrameDescriptor] = useState<Float32Array | null>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [wasCorrectPose, setWasCorrectPose] = useState(false);
  const [ballColorState, setBallColorState] = useState<'neutral' | 'correct' | 'error'>('neutral');
  const progressRef = useRef(0);
  const currentStepRef = useRef<LivenessStep>('front');
  const currentStepIndexRef = useRef(0);

  useLayoutEffect(() => {
    progressRef.current = progress;
    currentStepRef.current = STEPS[currentStepIndex];
    currentStepIndexRef.current = currentStepIndex;
  }, [progress, currentStepIndex]);

  const { getHeadPose, isLookingFront, isLookingLeft, isLookingRight } = useHeadPose();

  // Framer Motion values
  const ballX = useMotionValue(0);
  const ballY = useMotionValue(0);

  const ringMotionVal = useMotionValue(0);

  // Spring animations for smooth movement
  const ballXSpring = useSpring(ballX, { stiffness: 400, damping: 35, mass: 0.8 });
  const ballYSpring = useSpring(ballY, { stiffness: 400, damping: 35, mass: 0.8 });
  const ringSpring = useSpring(ringMotionVal, { stiffness: 200, damping: 25 });

  // Transform for ball position (normalized -1 to 1 -> percentage for CSS)
  const ballXPercent = useTransform(ballXSpring, [-1, 1], ['-80%', '80%']);
  const ballYPercent = useTransform(ballYSpring, [-1, 1], ['-80%', '80%']);
  
  // Ring progress transform (0-100 -> stroke-dashoffset)
  const ringOffset = useTransform(ringSpring, [0, 100], [RING_CIRCUMFERENCE, 0]);

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

  // Reset state when step changes
  useEffect(() => {
    setBlinkValidated(false);
    setFrontStepStartTime(Date.now());
    setBallColorState('neutral');
    if (modelsLoaded) {
      setMessage(stepConfig.instruction);
      setProgress(0);
      ringMotionVal.set(0);
      if ('vibrate' in navigator) {
        navigator.vibrate(30);
      }
    }
  }, [currentStepIndex, modelsLoaded, stepConfig.instruction]);

  const checkPose = useCallback(async () => {
    if (!videoRef.current || !modelsLoaded || videoRef.current.readyState !== 4) {
      return;
    }

    try {
      const detectorOptions = new faceapi.TinyFaceDetectorOptions({
        inputSize: 320,
        scoreThreshold: 0.5,
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
        const step = currentStepRef.current;

        if (step === 'front') {
          const poseOk = isLookingFront(headPose, YAW_THRESHOLD_FRONT);
          const blinked = ear < BLINK_THRESHOLD_FRONT;
          const timeInFront = Date.now() - frontStepStartTime;

          if (blinked) {
            setBlinkValidated(true);
          }

          stepPassed = poseOk && (blinkValidated || timeInFront > FRONT_TIMEOUT_MS);
        } else {
          stepPassed = step === 'left'
            ? isLookingLeft(headPose, YAW_THRESHOLD_SIDE)
            : isLookingRight(headPose, YAW_THRESHOLD_SIDE);
        }

        // Drive ball position from actual yaw (normalized to thresholds)
        const normalizedYaw = Math.max(-1, Math.min(1, -headPose.yaw / YAW_THRESHOLD_SIDE));
        animate(ballX, normalizedYaw, {
          type: 'spring',
          stiffness: 400,
          damping: 35,
          mass: 0.8,
        });

        if (stepPassed) {
          const newProgress = Math.min(100, progressRef.current + 25);
          setProgress(newProgress);
          ringMotionVal.set(newProgress);
          setLastIncrementTime(Date.now());
          setBallColorState('correct');

          if (newProgress >= 80) {
            if (faceDescriptor) {
              const distance = faceapi.euclideanDistance(detection.descriptor, faceDescriptor);
              if (distance < 0.5) {
                setBestFrameDescriptor(detection.descriptor);
              }
            } else {
              setBestFrameDescriptor(detection.descriptor);
            }

            const stepIdx = currentStepIndexRef.current;
            if (stepIdx < STEPS.length - 1) {
              setCurrentStepIndex(stepIdx + 1);
              setProgress(0);
              if ('vibrate' in navigator) {
                navigator.vibrate([30, 50, 30]);
              }
            } else {
              setMessage('Validação concluída!');
              ringMotionVal.set(100);
              setProgress(100);
              if ('vibrate' in navigator) {
                navigator.vibrate(200);
              }
              setTimeout(() => {
                if (bestFrameDescriptor) {
                  onComplete(bestFrameDescriptor);
                }
              }, 500);
            }
          }
        } else {
          setBallColorState('error');
          if (step === 'front') {
            const timeSinceIncrement = Date.now() - lastIncrementTime;
            if (timeSinceIncrement > 4000) {
              const newProgress = Math.max(0, progressRef.current - 5);
              setProgress(newProgress);
              ringMotionVal.set(newProgress);
            }
          }
        }

        const yawDeg = Math.round(headPose.yaw);

        if (!stepPassed) {
          if (step === 'front') {
            setMessage(`Centralize o rosto (Yaw: ${yawDeg}°)`);
          } else if (step === 'left') {
            setMessage(`Vire mais para a esquerda (Yaw: ${yawDeg}°)`);
          } else if (step === 'right') {
            setMessage(`Vire mais para a direita (Yaw: ${yawDeg}°)`);
          }
        }
        setWasCorrectPose(stepPassed);
      } else {
        setMessage('Rosto não detectado. Posicione-se frente à câmera.');
        setBallColorState('neutral');
        ringMotionVal.set(0);
        setProgress(0);
        setWasCorrectPose(false);
      }
    } catch (err) {
      console.error('Erro na detecção:', err);
    }
  }, [
    videoRef,
    modelsLoaded,
    blinkValidated,
    frontStepStartTime,
    lastIncrementTime,
    faceDescriptor,
    getHeadPose,
    isLookingFront,
    isLookingLeft,
    isLookingRight,
    onComplete,
    bestFrameDescriptor,
    ballX,
  ]);

  useEffect(() => {
    if (!modelsLoaded) return;

    const interval = setInterval(checkPose, 100);
    animationRef.current = interval;

    return () => {
      clearInterval(interval);
      animationRef.current = null;
      animate(ballX, 0, { type: 'spring', stiffness: 400, damping: 35 });
      ringMotionVal.set(0);
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
            className={`h-full transition-all duration-300 ${
              ballColorState === 'correct' ? 'bg-emerald-500' : ballColorState === 'error' ? 'bg-red-500' : 'bg-blue-500'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className="text-white text-center mt-2 text-sm">{message}</p>
      </div>

      <BallVisual
        ballXPercent={ballXPercent}
        ballYPercent={ballYPercent}
        ringOffset={ringOffset}
        isCorrectPose={wasCorrectPose}
        targetX={stepConfig.targetX}
        targetY={stepConfig.targetY}
      />

      <div className="flex items-center gap-3 mb-8 px-4">
        {currentStep === 'front' && (
          <>
            <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center ${
              blinkValidated ? 'border-emerald-500 bg-emerald-500/20' : 'border-white/30'
            }`}>
              <span className="text-white text-lg">{blinkValidated ? '✓' : '👁'}</span>
            </div>
            <span className="text-white text-sm">Pisque para confirmar</span>
          </>
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

      {import.meta.env.DEV && (
        <div className="fixed top-2 left-2 z-50 bg-black/80 text-white text-xs font-mono p-3 rounded-lg pointer-events-none">
          <div>Step: {currentStep} ({currentStepIndex + 1}/{STEPS.length})</div>
          <div>Yaw: {Math.round(pose.yaw)}° | Pitch: {Math.round(pose.pitch)}° | Roll: {Math.round(pose.roll)}°</div>
          <div>Progress: {progress}% | Blink: {String(blinkValidated)}</div>
          <div>Ball: {ballColorState}</div>
          <div>Device: {navigator.userAgent.match(/Mobile|Android|iPhone/) ? 'Mobile' : 'Desktop'}</div>
        </div>
      )}
    </div>
  );
}