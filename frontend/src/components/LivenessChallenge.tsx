import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { useHeadPose, calculateEAR, BLINK_THRESHOLD_FRONT, YAW_THRESHOLD_FRONT, YAW_THRESHOLD_SIDE } from '../hooks/useHeadPose';
import type { HeadPose } from '../hooks/useHeadPose';
import * as faceapi from 'face-api.js';
import { motion, useMotionValue, useSpring, useTransform, animate } from 'framer-motion';
import { api } from '../services/api';

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
  holdDuration: number;
  validationsNeeded: number;
}> = {
  front: {
    label: 'Olhe para frente',
    instruction: 'Centralize o rosto no círculo',
    icon: '👁️',
    color: 'emerald',
    targetX: 0,
    targetY: 0,
    requiresBlink: true,
    holdDuration: 4000,
    validationsNeeded: 1,
  },
  left: {
    label: 'Vire para a esquerda',
    instruction: 'Vire o rosto até a bola chegar ao alvo (≈20°)',
    icon: '◀️',
    color: 'blue',
    targetX: -1,
    targetY: 0,
    requiresBlink: false,
    holdDuration: 2000,
    validationsNeeded: 1,
  },
  right: {
    label: 'Vire para a direita',
    instruction: 'Vire o rosto até a bola chegar ao alvo (≈20°)',
    icon: '▶️',
    color: 'blue',
    targetX: 1,
    targetY: 0,
    requiresBlink: false,
    holdDuration: 2000,
    validationsNeeded: 1,
  },
};

const STEPS: Exclude<LivenessStep, 'complete'>[] = ['front', 'left', 'right'];

const RING_RADIUS = 54;
const RING_STROKE = 6;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const SPIN_SEGMENT = RING_CIRCUMFERENCE * 0.25;

/*
function DevOverlay({
  currentStep,
  currentStepIndex,
  pose,
  blinkValidated,
  validationsNeeded,
}: {
  currentStep: string;
  currentStepIndex: number;
  pose: HeadPose;
  blinkValidated: boolean;
  validationsNeeded: number;
}) 
{
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 200);
    return () => clearInterval(id);
  }, []);

  void tick;

  return (
    <div className="fixed top-2 left-2 z-50 bg-black/80 text-white text-xs font-mono p-3 rounded-lg pointer-events-none">
      <div>Step: {currentStep} ({currentStepIndex + 1}/{STEPS.length})</div>
      <div>Yaw: {Math.round(pose.yaw)}° | Pitch: {Math.round(pose.pitch)}° | Roll: {Math.round(pose.roll)}°</div>
      <div>Blink: {String(blinkValidated)}</div>
      <div>Validations needed: {validationsNeeded}</div>
      <div>Device: {navigator.userAgent.match(/Mobile|Android|iPhone/) ? 'Mobile' : 'Desktop'}</div>
    </div>
  );
}
*/

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
}) {
  const targetXPercent = `${targetX * 80}%`;
  const targetYPercent = `${targetY * 80}%`;

  return (
    <div className="flex flex-col items-center gap-4">
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
            stroke="rgba(255,255,255,0.15)"
            strokeWidth={RING_STROKE}
          />
          {ringStrokeMode === 'spin' ? (
            <motion.circle
              cx="60"
              cy="60"
              r={RING_RADIUS}
              fill="none"
              stroke="#10b981"
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
              stroke={isCorrectPose ? '#10b981' : '#ef4444'}
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
                borderColor: isCorrectPose ? '#10b981' : '#fbbf24',
                backgroundColor: 'transparent',
              }}
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <motion.div
              className="absolute w-10 h-10 rounded-full shadow-lg"
              style={{
                x: ballXPercent,
                y: '0%',
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
          </>
        )}
      </motion.div>

      <div className="flex items-center gap-2">
        {STEPS.map((step, idx) => (
          <motion.div
            key={step}
            className="w-2.5 h-2.5 rounded-full transition-colors"
            animate={{
              backgroundColor:
                idx < currentStepIndex
                  ? '#10b981'
                  : idx === currentStepIndex
                    ? '#eab308'
                    : 'rgba(255,255,255,0.3)',
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
  faceDescriptor
}: LivenessChallengeProps) {
  const animationRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [, setPose] = useState<HeadPose>({ yaw: 0, pitch: 0, roll: 0 });
  const [blinkValidated, setBlinkValidated] = useState(false);
  const [message, setMessage] = useState('');
  const [bestFrameDescriptor, setBestFrameDescriptor] = useState<Float32Array | null>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [wasCorrectPose, setWasCorrectPose] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [ringStrokeMode, setRingStrokeMode] = useState<'progress' | 'spin'>('progress');

  const progressRef = useRef(0);
  const currentStepRef = useRef<LivenessStep>('front');
  const currentStepIndexRef = useRef(0);
  const bestFrameDescriptorRef = useRef<Float32Array | null>(null);
  const validationsCountRef = useRef(0);
  const ringValueRef = useRef(0);
  const poseHoldStartRef = useRef(0);
  const isValidatingRef = useRef(false);
  const waitingForBlinkRef = useRef(false);

  useLayoutEffect(() => {
    bestFrameDescriptorRef.current = bestFrameDescriptor;
  }, [bestFrameDescriptor]);

  useLayoutEffect(() => {
    currentStepRef.current = STEPS[currentStepIndex];
    currentStepIndexRef.current = currentStepIndex;
  }, [currentStepIndex]);

  const { getHeadPose, isLookingFront, isLookingLeft, isLookingRight } = useHeadPose();

  const ballX = useMotionValue(0);
  const ringMotionVal = useMotionValue(0);
  const ringRotate = useMotionValue(0);

  const ballXSpring = useSpring(ballX, { stiffness: 400, damping: 35, mass: 0.8 });
  const ringSpring = useSpring(ringMotionVal, { stiffness: 200, damping: 25 });

  const ballXPercent = useTransform(ballXSpring, [-1, 1], ['-80%', '80%']);
  const ringOffset = useTransform(ringSpring, [0, 100], [RING_CIRCUMFERENCE, 0]);

  const currentStep = STEPS[currentStepIndex];
  const stepConfig = STEP_CONFIG[currentStep];

  useEffect(() => {
    const unsubscribe = ringMotionVal.on('change', (v) => {
      ringValueRef.current = v;
      progressRef.current = v;
    });
    return unsubscribe;
  }, [ringMotionVal]);

  const cancelFillAnimation = useCallback(() => {
    // No longer used - kept for compatibility with existing references
  }, []);

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
    if (stepIdx < STEPS.length - 1) {
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
  }, [ringMotionVal, onComplete]);

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

  useEffect(() => {
    setBlinkValidated(false);
    setWasCorrectPose(false);
    setMessage('');
    validationsCountRef.current = 0;
    cancelFillAnimation();
    ringMotionVal.set(0);
    progressRef.current = 0;
    ringValueRef.current = 0;
    poseHoldStartRef.current = 0;
    isValidatingRef.current = false;
    waitingForBlinkRef.current = false;
    if (modelsLoaded && 'vibrate' in navigator) {
      navigator.vibrate(30);
    }
  }, [currentStepIndex, modelsLoaded, ringMotionVal, cancelFillAnimation]);

  const validateDescriptorWithBackend = useCallback(async (descriptor: Float32Array): Promise<{ success: boolean; distance: number }> => {
    try {
      const descriptorArray = Array.from(descriptor);
      const result = await api.employees.verifyFace(descriptorArray);
      return { success: result.success, distance: result.distance };
    } catch (err) {
      console.error('Erro na verificação backend:', err);
      return { success: false, distance: -1 };
    }
  }, []);

  const fallbackLocalComparison = useCallback((descriptor: Float32Array): boolean => {
    if (!faceDescriptor) return false;
    const distance = faceapi.euclideanDistance(descriptor, faceDescriptor);
    return distance < 0.5;
  }, [faceDescriptor]);

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

    setMessage('');
  }, [ringMotionVal, playTransitionAnimation, advanceToNextStep]);

  const checkPose = useCallback(async () => {
    if (!videoRef.current || !modelsLoaded || videoRef.current.readyState !== 4) {
      return;
    }

    if (isTransitioning) return;

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
          setMessage('');

          if (heldTime >= config.holdDuration && !isValidatingRef.current) {
            isValidatingRef.current = true;

            // Registration mode: no saved descriptor to compare against
            if (!faceDescriptor) {
              handleValidationSuccess(detection.descriptor);
              isValidatingRef.current = false;
            } else {
              // Check-in mode: validate against backend
              const backendResult = await validateDescriptorWithBackend(detection.descriptor);

              if (backendResult.success) {
                if (step === 'front' && !blinkValidated) {
                  waitingForBlinkRef.current = true;
                  setMessage('Pisque para confirmar');
                  isValidatingRef.current = false;
                  return;
                }
                handleValidationSuccess(detection.descriptor);
              } else if (backendResult.distance >= 0) {
                if (fallbackLocalComparison(detection.descriptor)) {
                  if (step === 'front' && !blinkValidated) {
                    waitingForBlinkRef.current = true;
                    setMessage('Pisque para confirmar');
                    isValidatingRef.current = false;
                    return;
                  }
                  handleValidationSuccess(detection.descriptor);
                } else {
                  poseHoldStartRef.current = 0;
                  ringMotionVal.set(0);
                  setMessage(`Rosto não reconhecido (dist: ${backendResult.distance.toFixed(2)})`);
                }
              } else {
                if (fallbackLocalComparison(detection.descriptor)) {
                  if (step === 'front' && !blinkValidated) {
                    waitingForBlinkRef.current = true;
                    setMessage('Pisque para confirmar');
                    isValidatingRef.current = false;
                    return;
                  }
                  handleValidationSuccess(detection.descriptor);
                } else {
                  poseHoldStartRef.current = 0;
                  ringMotionVal.set(0);
                  setMessage('Erro de conexão. Tente novamente.');
                }
              }

              isValidatingRef.current = false;
            }
          }
        } else {
          poseHoldStartRef.current = 0;
          waitingForBlinkRef.current = false;
          setWasCorrectPose(false);

          ringMotionVal.set(0);

          const yawDeg = Math.round(-headPose.yaw);
          if (step === 'front') {
            setMessage(`Centralize o rosto (Yaw: ${yawDeg}°)`);
          } else if (step === 'left') {
            setMessage(`Vire mais para a esquerda (Yaw: ${yawDeg}°)`);
          } else if (step === 'right') {
            setMessage(`Vire mais para a direita (Yaw: ${yawDeg}°)`);
          }
        }
      } else {
        setMessage('Rosto não detectado. Posicione-se frente à câmera.');
        setWasCorrectPose(false);
      }
    } catch (err) {
      console.error('Erro na detecção:', err);
    }
  }, [
    videoRef,
    modelsLoaded,
    isTransitioning,
    blinkValidated,
    faceDescriptor,
    getHeadPose,
    isLookingFront,
    isLookingLeft,
    isLookingRight,
    ballX,
    ringMotionVal,
    validateDescriptorWithBackend,
    fallbackLocalComparison,
    handleValidationSuccess,
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
    <div className="absolute inset-0 z-20 pointer-events-none flex flex-col items-center justify-between p-4">
      {!modelsLoaded ? (
        <div className="flex items-center justify-center bg-black/80 text-white w-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent mx-auto mb-4" />
            <p>Carregando modelos de validação...</p>
          </div>
        </div>
      ) : (
        <>
          <div className="w-full max-w-md text-center">
            <div className="flex items-center justify-center gap-3 mb-2">
              <span className="text-2xl">{stepConfig.icon}</span>
              <div>
                <p className="text-white font-bold text-lg">{stepConfig.label}</p>
                <p className="text-emerald-300 text-sm">{stepConfig.instruction}</p>
              </div>
            </div>

            {message && (
              <motion.p
                className="text-white/90 text-sm"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                key={message}
              >
                {message}
              </motion.p>
            )}
          </div>

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
          />

          <button
            onClick={onCancel}
            className="w-full max-w-[200px] py-3 bg-white/10 hover:bg-white/20 text-white rounded-full font-bold transition-all active:scale-95 pointer-events-auto"
          >
            Cancelar
          </button>
        </>
      )}
    </div>
  );
}
