import * as faceapi from 'face-api.js';

/** Nome da partição no Cache Storage do navegador */
const CACHE_NAME = 'viggo-face-models-v1';

/** Lista de arquivos obrigatórios que compõem os 3 modelos de IA usados no Viggo */
const REQUIRED_MODEL_FILES = [
  '/models/tiny_face_detector_model-weights_manifest.json',
  '/models/tiny_face_detector_model-shard1',
  '/models/tiny_face_detector_model-shard2',
  '/models/face_landmark_68_model-weights_manifest.json',
  '/models/face_landmark_68_model-shard1',
  '/models/face_recognition_model-weights_manifest.json',
  '/models/face_recognition_model-shard1',
  '/models/face_recognition_model-shard2',
];

/** Tempo limite máximo para download dos modelos (15 segundos) */
const TIMEOUT_MS = 15_000;

/** Promise compartilhada enquanto o carregamento está em andamento. Evita downloads duplicados. */
let modelsPromise: Promise<void> | null = null;

/** Flag para garantir que o interceptor de Cache Storage só seja configurado uma única vez */
let isFetchIntercepted = false;

/**
 * Configura interceptor nativo de fetch para servir `/models/*` diretamente
 * do Cache Storage (Cache-First). Caso ainda não esteja em cache, baixa da rede e grava.
 */
function setupModelsFetchCacheInterceptor() {
  if (isFetchIntercepted || typeof window === 'undefined' || !('caches' in window)) {
    return;
  }
  isFetchIntercepted = true;

  const originalFetch = window.fetch;
  window.fetch = async function (input, init) {
    const url = typeof input === 'string' ? input : input instanceof Request ? input.url : '';
    if (url.includes('/models/')) {
      try {
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(input);
        if (cachedResponse) {
          return cachedResponse;
        }
        const networkResponse = await originalFetch(input, init);
        if (networkResponse && networkResponse.ok) {
          cache.put(input, networkResponse.clone()).catch((err) => {
            console.warn('Não foi possível gravar modelo no Cache Storage:', err);
          });
        }
        return networkResponse;
      } catch {
        return originalFetch(input, init);
      }
    }
    return originalFetch(input, init);
  };
}

// Inicializa o interceptor assim que o módulo for carregado
setupModelsFetchCacheInterceptor();

/**
 * Retorna true se os três modelos já estão carregados na memória do TensorFlow.
 * Usa o getter .isLoaded do próprio face-api como fonte de verdade.
 */
export function areFaceModelsLoaded(): boolean {
  return (
    faceapi.nets.tinyFaceDetector.isLoaded &&
    faceapi.nets.faceLandmark68Net.isLoaded &&
    faceapi.nets.faceRecognitionNet.isLoaded
  );
}

/**
 * Inspeciona o Cache Storage para verificar se todos os arquivos dos modelos
 * estão salvos fisicamente no dispositivo (auto-recuperação caso o usuário tenha limpado o cache).
 */
export async function areModelsInCacheStorage(): Promise<boolean> {
  if (typeof window === 'undefined' || !('caches' in window)) {
    return false;
  }
  try {
    const cache = await caches.open(CACHE_NAME);
    for (const fileUrl of REQUIRED_MODEL_FILES) {
      const match = await cache.match(fileUrl);
      if (!match) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Pré-carrega os modelos da IA facial (TinyFaceDetector, FaceLandmarks68, FaceRecognition)
 * com as seguintes garantias:
 * - Cache-First: se já estiver no Cache Storage local, carrega do disco em 0ms.
 * - Auto-Recuperação: se o usuário limpou o cache, identifica a ausência e baixa novamente.
 * - Timeout de 15 segundos: cancela com erro amigável se a rede travar por mais de 15s.
 * - Idempotente e Thread-safe: compartilhamento de Promise entre chamadas concorrentes.
 */
export function preloadFaceModels(): Promise<void> {
  // Já carregados na memória RAM/GPU — retorno imediato sem I/O
  if (areFaceModelsLoaded()) {
    return Promise.resolve();
  }

  // Carregamento já em andamento — retorna a mesma Promise
  if (modelsPromise) {
    return modelsPromise;
  }

  setupModelsFetchCacheInterceptor();

  const MODEL_URL = '/models';

  // Promise principal de carregamento e warm-up da GPU
  const loadPromise = Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ]).then(async () => {
    // Warm-up em background: compila shaders WebGL e inicializa tensores na GPU
    // antes de abrir a câmera, eliminando qualquer travamento inicial.
    try {
      if (typeof document !== 'undefined') {
        const dummyCanvas = document.createElement('canvas');
        dummyCanvas.width = 128;
        dummyCanvas.height = 128;
        const ctx = dummyCanvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#808080';
          ctx.fillRect(0, 0, 128, 128);
        }
        await faceapi.detectSingleFace(dummyCanvas, new faceapi.TinyFaceDetectorOptions({ inputSize: 160 }));
      }
    } catch (warmupErr) {
      console.warn('Warm-up de modelos faciais:', warmupErr);
    }
  });

  // Temporizador de 15 segundos para evitar que a UI fique em espera infinita se a rede travar
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error("Tempo limite excedido (15s) ao carregar a validação facial. Verifique sua conexão e tente novamente."));
    }, TIMEOUT_MS);
  });

  modelsPromise = Promise.race([loadPromise, timeoutPromise])
    .then(() => {
      clearTimeout(timeoutId);
      modelsPromise = null;
    })
    .catch((err) => {
      clearTimeout(timeoutId);
      // Reseta a referência para permitir que o usuário tente novamente clicando no botão
      modelsPromise = null;
      console.error('Erro ao carregar modelos do face-api:', err);
      throw err;
    });

  return modelsPromise;
}
