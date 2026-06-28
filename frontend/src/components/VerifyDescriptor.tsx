import * as faceapi from 'face-api.js';

export function verificarPonto(
  faceDescriptor: number[],
  videoRef: React.RefObject<HTMLVideoElement | null>,
  setMessage: (msg: string) => void,
  cancelSignal?: AbortSignal
): Promise<{ success: boolean }> {

  if (!videoRef.current) return Promise.resolve({ success: false });

  setMessage("Buscando rosto...")

  const detectorOptions = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });
  const descriptorSalvo = new Float32Array(Object.values(faceDescriptor));

  let frameCount = 0;
  const maxFrames = 300; // ~5 seconds at 60fps
  let lastMessageTime = 0;
  let consecutiveMatches = 0;
  const requiredConsecutiveMatches = 3; // Need 3 consecutive matches for stability

  return new Promise((resolve) => {
    let animationFrameId: number | null = null;

    const cleanup = () => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
    };

    // Se o sinal de cancelamento for acionado, rejeita a Promise
    const onAbort = () => {
      cleanup();
      setMessage("Verificação cancelada.");
      resolve({ success: false });
    };

    if (cancelSignal) {
      // Se já estiver abortado
      if (cancelSignal.aborted) {
        onAbort();
        return;
      }
      cancelSignal.addEventListener('abort', onAbort);
    }

    const processFrame = async () => {
      if (cancelSignal?.aborted) return;

      if (frameCount >= maxFrames) {
        setMessage("Não foi possível confirmar sua identidade.");
        cleanup();
        resolve({ success: false });
        return;
      }

      if (!videoRef.current || videoRef.current.readyState !== 4) {
        frameCount++;
        animationFrameId = requestAnimationFrame(processFrame);
        return;
      }

      try {
        const detection = await faceapi
          .detectSingleFace(videoRef.current, detectorOptions)
          .withFaceLandmarks()
          .withFaceDescriptor();

        frameCount++;

        if (!detection) {
          consecutiveMatches = 0;
          const now = Date.now();
          if (now - lastMessageTime > 1000) {
            setMessage("Rosto não detectado. Posicione-se ao centro.");
            lastMessageTime = now;
          }
        } else {
          const distance = faceapi.euclideanDistance(detection.descriptor, descriptorSalvo);

          if (distance < 0.5) {
            consecutiveMatches++;
            const now = Date.now();
            if (now - lastMessageTime > 500) {
              setMessage(`Verificando identidade confirmada (${consecutiveMatches}/${requiredConsecutiveMatches})...`);
              lastMessageTime = now;
            }

            if (consecutiveMatches >= requiredConsecutiveMatches) {
              setMessage("Identidade confirmada!");
              cleanup();
              resolve({ success: true });
              return;
            }
          } else {
            consecutiveMatches = 0;
            const now = Date.now();
            if (now - lastMessageTime > 1000) {
              setMessage(`Rosto detectado, mas não reconhecido (dist: ${distance.toFixed(2)}). Tente novamente.`);
              lastMessageTime = now;
            }
          }
        }
      } catch (err) {
        console.error('Erro na detecção:', err);
      }

      animationFrameId = requestAnimationFrame(processFrame);
    };

    processFrame();
  });
}