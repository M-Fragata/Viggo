import { useState, useEffect, useCallback, useRef, useLayoutEffect, useMemo } from 'react';
import { useHeadPose, calculateEAR, BLINK_THRESHOLD_FRONT, YAW_THRESHOLD_FRONT, YAW_THRESHOLD_SIDE } from '../hooks/useHeadPose';
import type { HeadPose } from '../hooks/useHeadPose';
import * as faceapi from 'face-api.js';
import { motion, useMotionValue, useSpring, useTransform, animate } from 'framer-motion';
import { api } from '../services/api';
import { preloadFaceModels, areFaceModelsLoaded } from '../utils/faceModels';

type LivenessStep = 'front' | 'left' | 'right';

interface LivenessChallengeProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onComplete: (bestFrameDescriptor: Float32Array) => void;
  onCancel: () => void;
  faceToken?: string;
  facialMode?: 'FRONTAL_ONLY' | 'FULL_LIVENESS';
  verifyOverride?: (descriptor: Float32Array) => Promise<{ success: boolean; distance: number; message?: string }>;
  onModelsLoaded?: () => void;
  onStepChange?: (message: string) => void;
  onRetry?: () => Promise<string | null>;
}

const STEP_CONFIG: Record<LivenessStep, {
  label: string;
  instruction: string;
  icon: string;
  targetX: number;
  targetY: number;
  holdDuration: number;
  validationsNeeded: number;
}> = {
  front: {
    label: 'Olhe para frente',
    instruction: 'Centralize o rosto no círculo',
    icon: '👁️',
    targetX: 0,
    targetY: 0,
    holdDuration: 4000,
    validationsNeeded: 1,
  },
  left: {
    label: 'Vire para a esquerda',
    instruction: 'Vire o rosto até a bola chegar ao alvo (≈20°)',
    icon: '◀️',
    targetX: -1,
    targetY: 0,
    holdDuration: 2000,
    validationsNeeded: 1,
  },
  right: {
    label: 'Vire para a direita',
    instruction: 'Vire o rosto até a bola chegar ao alvo (≈20°)',
    icon: '▶️',
    targetX: 1,
    targetY: 0,
    holdDuration: 2000,
    validationsNeeded: 1,
  },
};


const RING_RADIUS = 54;
const RING_STROKE = 6;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const SPIN_SEGMENT = RING_CIRCUMFERENCE * 0.25;

function FeedbackVisual({
  ballXPercent,
  ringOffset,
  ringRotate,
  isCorrectPose,
  targetX,
  targetY,
  isTransitioning,
  currentStepIndex,
  ringStrokeMode,
  ringColorMode,
  steps,
}: {
  ballXPercent: import('framer-motion').MotionValue<string>;
  ringOffset: import('framer-motion').MotionValue<number>;
  ringRotate: import('framer-motion').MotionValue<number>;
  isCorrectPose: boolean;
  targetX: number;
  targetY: number;
  isTransitioning: boolean;
  currentStepIndex: number;
  ringStrokeMode: 'progress' | 'spin';
  ringColorMode: 'green' | 'red';
  isFailing: boolean;
  steps: LivenessStep[];
}) {
  const targetXPercent = `${targetX * 80}%`;
  const targetYPercent = `${targetY * 80}%`;
  const isRed = ringColorMode === 'red';

  return (
    <div className="flex flex-col items-center gap-4 flex-1 justify-center">
      <motion.div className="relative w-28 h-28 flex items-center justify-center">
        <motion.svg
          width="120"
          height="120"
          viewBox="0 0 120 120"
          className="transform -rotate-90"
          style={{ rotate: ringRotate }}
        >
          <circle
            cx="60"
            cy="60"
            r={RING_RADIUS}
            fill="none"
            stroke={isRed ? "rgba(239, 68, 68, 0.25)" : "rgba(255,255,255,0.15)"}
            strokeWidth={RING_STROKE}
          />
          {ringStrokeMode === 'spin' ? (
            <motion.circle
              cx="60"
              cy="60"
              r={RING_RADIUS}
              fill="none"
              stroke={isRed ? "#ef4444" : "#10b981"}
              strokeWidth={RING_STROKE}
              strokeLinecap="round"
              strokeDasharray={`${SPIN_SEGMENT} ${RING_CIRCUMFERENCE - SPIN_SEGMENT}`}
              style={{ strokeDashoffset: ringOffset }}
            />
          ) : (
            <motion.circle
              cx="60"
              cy="60"
              r={RING_RADIUS}
              fill="none"
              stroke={isRed ? '#ef4444' : (isCorrectPose ? '#10b981' : '#ef4444')}
              strokeWidth={RING_STROKE}
              strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE}
              style={{ strokeDashoffset: ringOffset }}
            />
          )}
        </motion.svg>

        {!isTransitioning && (
          <>
            <motion.div
              className="absolute w-10 h-10 rounded-full border-2 border-dashed"
              style={{
                x: targetXPercent,
                y: targetYPercent,
                borderColor: isRed ? '#ef4444' : (isCorrectPose ? '#10b981' : '#fbbf24'),
                backgroundColor: 'transparent',
              }}
              animate={{ opacity: isRed ? [1, 0.3, 1] : [0.6, 1, 0.6] }}
              transition={{ duration: isRed ? 0.6 : 1.5, repeat: Infinity }}
            />
            <motion.div
              className="absolute w-10 h-10 rounded-full shadow-lg"
              style={{
                x: ballXPercent,
                y: '0%',
                backgroundColor: isRed ? '#ef4444' : (isCorrectPose ? '#10b981' : '#f87171'),
              }}
              animate={
                isRed
                  ? { boxShadow: '0 0 25px rgba(239, 68, 68, 0.8)', scale: [1, 1.15, 1] }
                  : (isCorrectPose ? { boxShadow: '0 0 20px rgba(16, 185, 129, 0.5)' } : { boxShadow: '0 0 8px rgba(248, 113, 113, 0.3)' })
              }
              transition={isRed ? { duration: 0.5, repeat: Infinity } : undefined}
            />
            {isCorrectPose && !isRed && (
              <motion.div
                className="absolute w-2.5 h-2.5 rounded-full bg-white/20 border border-white/30"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
              />
            )}
          </>
        )}
      </motion.div>

      <div className="flex items-center gap-2">
        {steps.map((step, idx) => (
          <motion.div
            key={step}
            className="w-2.5 h-2.5 rounded-full transition-colors"
            animate={{
              backgroundColor: isRed
                ? '#ef4444'
                : (idx < currentStepIndex
                    ? '#10b981'
                    : idx === currentStepIndex
                      ? '#eab308'
                      : 'rgba(255,255,255,0.3)'),
              scale: idx === currentStepIndex ? [1, 1.3, 1] : 1,
            }}
            transition={idx === currentStepIndex ? { duration: 1.5, repeat: Infinity } : { duration: 0.3 }}
          />
        ))}
      </div>
    </div>
  );
}

export function LivenessChallenge({
  videoRef,
  onComplete,
  onCancel,
  faceToken,
  facialMode,
  verifyOverride,
  onModelsLoaded,
  onStepChange,
  onRetry
}: LivenessChallengeProps) {
  const steps: LivenessStep[] = useMemo(() => {
    if (facialMode === 'FRONTAL_ONLY') {
      return ['front'];
    }
    if (facialMode === 'FULL_LIVENESS') {
      return ['front', 'left', 'right'];
    }
    return faceToken ? ['front', 'left', 'right'] : ['front'];
  }, [faceToken, facialMode]);

  const animationRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [, setPose] = useState<HeadPose>({ yaw: 0, pitch: 0, roll: 0 });
  const [blinkValidated, setBlinkValidated] = useState(false);
  const [bestFrameDescriptor, setBestFrameDescriptor] = useState<Float32Array | null>(null);
  const [modelsLoaded, setModelsLoaded] = useState(() => areFaceModelsLoaded());
  const [wasCorrectPose, setWasCorrectPose] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [ringStrokeMode, setRingStrokeMode] = useState<'progress' | 'spin'>('progress');
  const [ringColorMode, setRingColorMode] = useState<'green' | 'red'>('green');
  const [isFailing, setIsFailing] = useState(false);

  const currentStepRef = useRef<LivenessStep>('front');
  const currentStepIndexRef = useRef(0);
  const bestFrameDescriptorRef = useRef<Float32Array | null>(null);
  const validationsCountRef = useRef(0);
  const poseHoldStartRef = useRef(0);
  const isValidatingRef = useRef(false);
  const waitingForBlinkRef = useRef(false);
  const activeFaceTokenRef = useRef<string | undefined>(faceToken);
  const onRetryRef = useRef(onRetry);
  const onCancelRef = useRef(onCancel);

  useEffect(() => {
    activeFaceTokenRef.current = faceToken;
  }, [faceToken]);

  useEffect(() => {
    onRetryRef.current = onRetry;
  });

  useEffect(() => {
    onCancelRef.current = onCancel;
  });

  useLayoutEffect(() => {
    bestFrameDescriptorRef.current = bestFrameDescriptor;
  }, [bestFrameDescriptor]);

  useLayoutEffect(() => {
    currentStepRef.current = steps[currentStepIndex];
    currentStepIndexRef.current = currentStepIndex;
  }, [currentStepIndex, steps]);

  const { getHeadPose, isLookingFront, isLookingLeft, isLookingRight } = useHeadPose();

  const onModelsLoadedRef = useRef(onModelsLoaded);
  useEffect(() => {
    onModelsLoadedRef.current = onModelsLoaded;
  });

  const onStepChangeRef = useRef(onStepChange);
  useEffect(() => {
    onStepChangeRef.current = onStepChange;
  });

  const ballX = useMotionValue(0);
  const ringMotionVal = useMotionValue(0);
  const ringRotate = useMotionValue(0);

  const ballXSpring = useSpring(ballX, { stiffness: 400, damping: 35, mass: 0.8 });
  const ringSpring = useSpring(ringMotionVal, { stiffness: 200, damping: 25 });

  const ballXPercent = useTransform(ballXSpring, [-1, 1], ['-80%', '80%']);
  const ringOffset = useTransform(ringSpring, [0, 100], [RING_CIRCUMFERENCE, 0]);

  const currentStep = steps[currentStepIndex];
  const stepConfig = STEP_CONFIG[currentStep];

  const playTransitionAnimation = useCallback((onCompleteTransition: () => void) => {
    setIsTransitioning(true);
    setRingStrokeMode('spin');

    ringMotionVal.set(100);

    setTimeout(() => {
      animate(ringRotate, 360, {
        duration: 0.6,
        ease: 'easeInOut',
        onComplete: () => {
          ringRotate.set(0);
          ringMotionVal.set(0);
          setRingStrokeMode('progress');
          setIsTransitioning(false);
          onCompleteTransition();
        },
      });
    }, 200);
  }, [ringMotionVal, ringRotate]);

  const advanceToNextStep = useCallback(() => {
    const stepIdx = currentStepIndexRef.current;
    if (stepIdx < steps.length - 1) {
      setCurrentStepIndex(stepIdx + 1);
      if ('vibrate' in navigator) {
        navigator.vibrate([30, 50, 30]);
      }
    } else {
      ringMotionVal.set(100);
      if ('vibrate' in navigator) {
        navigator.vibrate(200);
      }
      setTimeout(() => {
        const descriptor = bestFrameDescriptorRef.current;
        if (descriptor) {
          onComplete(descriptor);
        }
      }, 500);
    }
  }, [ringMotionVal, onComplete, steps.length]);

  useEffect(() => {
    if (areFaceModelsLoaded()) {
      setModelsLoaded(true);
      onModelsLoadedRef.current?.();
      return;
    }

    let isMounted = true;
    preloadFaceModels()
      .then(() => {
        if (isMounted) {
          setModelsLoaded(true);
          onModelsLoadedRef.current?.();
        }
      })
      .catch((err) => {
        console.error('Erro ao carregar modelos:', err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const stepMessages: Record<LivenessStep, string> = {
      front: 'Centralize seu rosto',
      left: 'Vire o rosto para a esquerda',
      right: 'Vire o rosto para a direita',
    };
    onStepChangeRef.current?.(stepMessages[steps[currentStepIndex]]);

    setBlinkValidated(false);
    setWasCorrectPose(false);
    validationsCountRef.current = 0;
    ringMotionVal.set(0);
    poseHoldStartRef.current = 0;
    isValidatingRef.current = false;
    waitingForBlinkRef.current = false;
    if (modelsLoaded && 'vibrate' in navigator) {
      navigator.vibrate(30);
    }
  }, [currentStepIndex, modelsLoaded, ringMotionVal, steps]);

  const validateDescriptorWithBackend = useCallback(async (descriptor: Float32Array): Promise<{ success: boolean; distance: number; message?: string }> => {
    try {
      if (verifyOverride) {
        return await verifyOverride(descriptor);
      }
      const currentToken = activeFaceTokenRef.current || faceToken;
      if (!currentToken) {
        return { success: true, distance: 0 };
      }
      const descriptorArray = Array.from(descriptor);
      const result = await api.employees.verifyFaceWithToken(currentToken, descriptorArray);
      return { success: result.success, distance: result.distance, message: result.message };
    } catch (err) {
      console.error('Erro na verificação backend:', err);
      return { success: false, distance: -1, message: "Sessão expirada ou erro na validação" };
    }
  }, [faceToken, verifyOverride]);

  const handleValidationSuccess = useCallback((descriptor: Float32Array) => {
    setBestFrameDescriptor(descriptor);
    poseHoldStartRef.current = 0;
    validationsCountRef.current += 1;
    setWasCorrectPose(true);

    const step = currentStepRef.current;
    const config = STEP_CONFIG[step as keyof typeof STEP_CONFIG];
    const count = validationsCountRef.current;
    const needed = config.validationsNeeded;

    if (count >= needed) {
      playTransitionAnimation(advanceToNextStep);
    }
  }, [ringMotionVal, playTransitionAnimation, advanceToNextStep]);

  const checkPose = useCallback(async () => {
    if (!videoRef.current || !modelsLoaded || videoRef.current.readyState !== 4) {
      return;
    }

    if (isTransitioning || isFailing) return;

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

        const step = currentStepRef.current;
        const config = STEP_CONFIG[step as keyof typeof STEP_CONFIG];

        // Se está aguardando blink após backend success no front
        if (waitingForBlinkRef.current && step === 'front') {
          const blinked = ear < BLINK_THRESHOLD_FRONT;
          if (blinked) {
            setBlinkValidated(true);
            waitingForBlinkRef.current = false;
            handleValidationSuccess(detection.descriptor);
          }
          return;
        }

        let stepPassed = false;

        if (step === 'front') {
          const poseOk = isLookingFront(headPose, YAW_THRESHOLD_FRONT);
          const blinked = ear < BLINK_THRESHOLD_FRONT;

          if (blinked) {
            setBlinkValidated(true);
          }

          // Para front: stepPassed depende APENAS da pose (não do blink)
          // O blink será validado após o backend retornar sucesso
          stepPassed = poseOk;
        } else {
          stepPassed = step === 'left'
            ? isLookingLeft(headPose, YAW_THRESHOLD_SIDE)
            : isLookingRight(headPose, YAW_THRESHOLD_SIDE);
        }

        const normalizedYaw = Math.max(-1, Math.min(1, -headPose.yaw / YAW_THRESHOLD_SIDE));
        animate(ballX, normalizedYaw, {
          type: 'spring',
          stiffness: 400,
          damping: 35,
          mass: 0.8,
        });

        if (stepPassed) {
          if (poseHoldStartRef.current === 0) {
            poseHoldStartRef.current = Date.now();
          }

          const heldTime = Date.now() - poseHoldStartRef.current;
          const holdProgress = Math.min(100, (heldTime / config.holdDuration) * 100);

          ringMotionVal.set(holdProgress);
          setWasCorrectPose(true);

          if (heldTime >= config.holdDuration && !isValidatingRef.current) {
            isValidatingRef.current = true;

            // Validate against backend using token
            const backendResult = await validateDescriptorWithBackend(detection.descriptor);

            if (backendResult.success) {
              if (step === 'front' && !blinkValidated) {
                waitingForBlinkRef.current = true;
                isValidatingRef.current = false;
                return;
              }
              handleValidationSuccess(detection.descriptor);
              isValidatingRef.current = false;
            } else {
              // FALHA DE COMPATIBILIDADE FACIAL OU TOKEN EXPIRADO
              setIsFailing(true);
              setRingColorMode('red');
              
              const failMsg = backendResult.message || (backendResult.distance === -1 ? "Sessão expirada. Reiniciando..." : "Rosto não compatível. Reiniciando...");
              onStepChangeRef.current?.(failMsg);

              if ('vibrate' in navigator) {
                navigator.vibrate([100, 50, 100]);
              }

              // Animação de dissolução do círculo vermelho por 2 segundos
              ringMotionVal.set(100);
              animate(ringMotionVal, 0, { duration: 2, ease: "easeOut" });

              setTimeout(async () => {
                if (onRetryRef.current) {
                  const newToken = await onRetryRef.current();
                  if (newToken) {
                    activeFaceTokenRef.current = newToken;
                    setCurrentStepIndex(0);
                    setBlinkValidated(false);
                    setWasCorrectPose(false);
                    validationsCountRef.current = 0;
                    poseHoldStartRef.current = 0;
                    waitingForBlinkRef.current = false;
                    ringMotionVal.set(0);
                    setRingColorMode('green');
                    setIsFailing(false);
                    isValidatingRef.current = false;

                    const stepMessages: Record<LivenessStep, string> = {
                      front: 'Centralize seu rosto',
                      left: 'Vire o rosto para a esquerda',
                      right: 'Vire o rosto para a direita',
                    };
                    onStepChangeRef.current?.(stepMessages[steps[0]]);
                    return;
                  }
                }
                // Se onRetry falhar ou não existir
                setIsFailing(false);
                isValidatingRef.current = false;
                onCancelRef.current?.();
              }, 2000);
            }
          }
        } else {
          poseHoldStartRef.current = 0;
          waitingForBlinkRef.current = false;
          setWasCorrectPose(false);

          ringMotionVal.set(0);
        }
      } else {
        setWasCorrectPose(false);
      }
    } catch (err) {
      console.error('Erro na detecção:', err);
    }
  }, [
    videoRef,
    modelsLoaded,
    isTransitioning,
    isFailing,
    blinkValidated,
    getHeadPose,
    isLookingFront,
    isLookingLeft,
    isLookingRight,
    ballX,
    ringMotionVal,
    validateDescriptorWithBackend,
    handleValidationSuccess,
    steps
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
  }, [modelsLoaded, checkPose, ballX, ringMotionVal]);

  return (
    <div className="absolute inset-0 z-20 pointer-events-none flex flex-col items-center p-4">
      {!modelsLoaded ? (
        <div className="absolute inset-0 z-30 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent" />
        </div>
      ) : (
        <>
          <FeedbackVisual
            ballXPercent={ballXPercent}
            ringOffset={ringOffset}
            ringRotate={ringRotate}
            isCorrectPose={wasCorrectPose}
            targetX={stepConfig.targetX}
            targetY={stepConfig.targetY}
            isTransitioning={isTransitioning}
            currentStepIndex={currentStepIndex}
            ringStrokeMode={ringStrokeMode}
            ringColorMode={ringColorMode}
            isFailing={isFailing}
            steps={steps}
          />

          <button
            onClick={onCancel}
            className="w-full max-w-[200px] py-3 bg-white/10 hover:bg-white/20 text-white rounded-full font-bold transition-all active:scale-95 pointer-events-auto mt-auto cursor-pointer"
          >
            Cancelar
          </button>
        </>
      )}
    </div>
  );
}
