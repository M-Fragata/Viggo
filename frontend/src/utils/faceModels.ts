import * as faceapi from 'face-api.js';

/** Promise compartilhada enquanto o carregamento está em andamento. Evita downloads duplicados. */
let modelsPromise: Promise<void> | null = null;

/**
 * Retorna true se os três modelos já estão carregados na memória do TensorFlow.
 * Usa o getter .isLoaded do próprio face-api como fonte de verdade, evitando
 * dessincronias entre a flag interna e o estado real dos modelos.
 */
export function areFaceModelsLoaded(): boolean {
  return (
    faceapi.nets.tinyFaceDetector.isLoaded &&
    faceapi.nets.faceLandmark68Net.isLoaded &&
    faceapi.nets.faceRecognitionNet.isLoaded
  );
}

/**
 * Pré-carrega os modelos da IA facial (TinyFaceDetector, FaceLandmarks68, FaceRecognition).
 * - Idempotente: retorna imediatamente se já carregados.
 * - Thread-safe: múltiplas chamadas concorrentes compartilham a mesma Promise,
 *   prevenindo downloads duplicados.
 */
export function preloadFaceModels(): Promise<void> {
  // Já carregados — retorno imediato sem I/O
  if (areFaceModelsLoaded()) {
    return Promise.resolve();
  }

  // Carregamento já em andamento — retorna a mesma Promise
  if (modelsPromise) {
    return modelsPromise;
  }

  const MODEL_URL = '/models';

  modelsPromise = Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ])
    .then(() => {
      // Promise concluída — limpa referência para liberar memória
      modelsPromise = null;
    })
    .catch((err) => {
      // Reseta em caso de falha de rede para permitir novas tentativas
      modelsPromise = null;
      console.error('Erro ao carregar modelos do face-api:', err);
      throw err;
    });

  return modelsPromise;
}
