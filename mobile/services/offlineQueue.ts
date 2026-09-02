import * as SecureStore from 'expo-secure-store';
import { api } from './api';

const OFFLINE_QUEUE_KEY = '@viggo:offline_checkins_queue';
const TOTEM_OFFLINE_QUEUE_KEY = '@viggo:totem:offline_queue';

export type CheckinType = 'ENTRY' | 'LUNCH_START' | 'LUNCH_END' | 'EXIT';

export interface OfflineCheckIn {
  id: string; // UUID válido para sincronização com o backend
  type: CheckinType;
  createdAt: string; // ISO string do momento da batida
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  photoBase64?: string;
  userId?: string;
  userName?: string;
  status: 'PENDING' | 'SYNCING' | 'ERROR';
  errorMessage?: string;
}

function generateUUID(): string {
  const s4 = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  return `${s4()}${s4()}-${s4()}-4${s4().substring(1)}-${s4()}-${s4()}${s4()}${s4()}`;
}

// -------------------------------------------------------------
// FILA DO APLICATIVO INDIVIDUAL (COLABORADOR)
// -------------------------------------------------------------

export async function getOfflineQueue(): Promise<OfflineCheckIn[]> {
  try {
    const raw = await SecureStore.getItemAsync(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Erro ao ler fila offline:', err);
    return [];
  }
}

export async function saveOfflineQueue(queue: OfflineCheckIn[]): Promise<void> {
  try {
    await SecureStore.setItemAsync(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.error('Erro ao salvar fila offline:', err);
  }
}

export async function enqueueOfflineCheckIn(data: {
  type?: CheckinType;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  photoBase64?: string;
  userId?: string;
  userName?: string;
}): Promise<OfflineCheckIn> {
  const item: OfflineCheckIn = {
    id: generateUUID(),
    type: data.type || 'ENTRY',
    createdAt: new Date().toISOString(),
    latitude: data.latitude,
    longitude: data.longitude,
    accuracy: data.accuracy,
    photoBase64: data.photoBase64,
    userId: data.userId,
    userName: data.userName,
    status: 'PENDING',
  };

  const queue = await getOfflineQueue();
  queue.push(item);
  await saveOfflineQueue(queue);

  return item;
}

export async function removeOfflineCheckIn(id: string): Promise<void> {
  const queue = await getOfflineQueue();
  const filtered = queue.filter((i) => i.id !== id);
  await saveOfflineQueue(filtered);
}

export async function syncOfflineQueue(): Promise<{
  synced: Array<{ id: string }>;
  syncedCount: number;
  failedCount: number;
  remaining: number;
}> {
  const queue = await getOfflineQueue();
  if (queue.length === 0) {
    return { synced: [], syncedCount: 0, failedCount: 0, remaining: 0 };
  }

  try {
    const payload = queue.map((item) => ({
      id: item.id,
      type: item.type,
      timestamp: item.createdAt,
      latitude: item.latitude ?? null,
      longitude: item.longitude ?? null,
      accuracy: item.accuracy ?? null,
    }));

    const response = await api.syncOfflineCheckIns(payload);

    // IDs dos itens sincronizados pelo backend
    const syncedIds = new Set(response.synced.map((s) => s.id));
    const remainingQueue = queue.filter((i) => !syncedIds.has(i.id));

    await saveOfflineQueue(remainingQueue);

    return {
      synced: response.synced,
      syncedCount: response.synced.length,
      failedCount: queue.length - response.synced.length,
      remaining: remainingQueue.length,
    };
  } catch (err) {
    console.warn('Erro ao sincronizar fila offline individual:', err);
    return {
      synced: [],
      syncedCount: 0,
      failedCount: queue.length,
      remaining: queue.length,
    };
  }
}

// -------------------------------------------------------------
// FILA DO MODO TOTEM
// -------------------------------------------------------------

export async function getTotemOfflineQueue(): Promise<OfflineCheckIn[]> {
  try {
    const raw = await SecureStore.getItemAsync(TOTEM_OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Erro ao ler fila offline do totem:', err);
    return [];
  }
}

export async function saveTotemOfflineQueue(queue: OfflineCheckIn[]): Promise<void> {
  try {
    await SecureStore.setItemAsync(TOTEM_OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.error('Erro ao salvar fila offline do totem:', err);
  }
}

export async function enqueueTotemOfflineCheckIn(data: {
  userId: string;
  userName?: string;
  type: CheckinType;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
}): Promise<OfflineCheckIn> {
  const item: OfflineCheckIn = {
    id: generateUUID(),
    userId: data.userId,
    userName: data.userName,
    type: data.type,
    createdAt: new Date().toISOString(),
    latitude: data.latitude,
    longitude: data.longitude,
    accuracy: data.accuracy,
    status: 'PENDING',
  };

  const queue = await getTotemOfflineQueue();
  queue.push(item);
  await saveTotemOfflineQueue(queue);

  return item;
}

export async function syncTotemOfflineQueue(): Promise<{
  syncedCount: number;
  failedCount: number;
  remaining: number;
}> {
  const queue = await getTotemOfflineQueue();
  if (queue.length === 0) {
    return { syncedCount: 0, failedCount: 0, remaining: 0 };
  }

  try {
    const payload = queue.map((item) => ({
      id: item.id,
      type: item.type,
      timestamp: item.createdAt,
      latitude: item.latitude ?? null,
      longitude: item.longitude ?? null,
      accuracy: item.accuracy ?? null,
    }));

    const response = await api.syncOfflineCheckIns(payload);

    const syncedIds = new Set(response.synced.map((s) => s.id));
    const remainingQueue = queue.filter((i) => !syncedIds.has(i.id));

    await saveTotemOfflineQueue(remainingQueue);

    return {
      syncedCount: response.synced.length,
      failedCount: queue.length - response.synced.length,
      remaining: remainingQueue.length,
    };
  } catch (err) {
    console.warn('Erro ao sincronizar fila offline do totem:', err);
    return {
      syncedCount: 0,
      failedCount: queue.length,
      remaining: queue.length,
    };
  }
}
