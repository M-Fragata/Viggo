import * as faceapi from 'face-api.js';

let modelsPromise: Promise<void> | null = null;
let modelsLoaded = false;

/**
 * Retorna true se os modelos do face-api já estiverem carregados na memória.
 */
export function areFaceModelsLoaded(): boolean {
  return modelsLoaded;
}

/**
 * Pré-carrega os modelos da IA facial (TinyFaceDetector, FaceLandmarks68, FaceRecognition)
 * mantendo uma única Promise em memória para evitar carregamento concorrente ou duplicado.
 */
export function preloadFaceModels(): Promise<void> {
  if (modelsLoaded) {
    return Promise.resolve();
  }

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
      modelsLoaded = true;
    })
    .catch((err) => {
      // Reseta a promise caso haja falha de rede para permitir novas tentativas
      modelsPromise = null;
      console.error('Erro ao carregar modelos do face-api:', err);
      throw err;
    });

  return modelsPromise;
}
