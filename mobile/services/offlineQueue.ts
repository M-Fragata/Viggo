import * as SecureStore from 'expo-secure-store';
import { api, CheckInItem } from './api';

const OFFLINE_QUEUE_KEY = '@viggo:offline_checkins_queue';

export interface OfflineCheckIn {
  id: string;
  createdAt: string;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  photoBase64?: string;
  status: 'PENDING' | 'SYNCING' | 'ERROR';
  errorMessage?: string;
}

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
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  photoBase64?: string;
}): Promise<OfflineCheckIn> {
  const item: OfflineCheckIn = {
    id: `offline_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    createdAt: new Date().toISOString(),
    latitude: data.latitude,
    longitude: data.longitude,
    accuracy: data.accuracy,
    photoBase64: data.photoBase64,
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
  synced: CheckInItem[];
  failed: number;
  remaining: number;
}> {
  const queue = await getOfflineQueue();
  if (queue.length === 0) {
    return { synced: [], failed: 0, remaining: 0 };
  }

  const synced: CheckInItem[] = [];
  const remainingQueue: OfflineCheckIn[] = [];
  let failed = 0;

  for (const item of queue) {
    try {
      const response = await api.registerCheckIn({
        latitude: item.latitude,
        longitude: item.longitude,
        accuracy: item.accuracy,
        photoBase64: item.photoBase64,
      });

      synced.push(response.checkIn);
    } catch (err: any) {
      console.warn(`Erro ao sincronizar ponto offline ${item.id}:`, err);
      failed++;
      remainingQueue.push({
        ...item,
        status: 'ERROR',
        errorMessage: err.message || 'Falha ao sincronizar',
      });
    }
  }

  await saveOfflineQueue(remainingQueue);

  return {
    synced,
    failed,
    remaining: remainingQueue.length,
  };
}
