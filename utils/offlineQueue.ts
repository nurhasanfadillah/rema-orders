import { get, set } from 'idb-keyval';

export interface OfflineQueueItem {
    id: string;
    type: 'CREATE' | 'UPDATE';
    payload: any; // The form data payload, which may include File objects natively supported by IndexedDB
    orderId?: string; // Only for updates
    timestamp: number;
}

const QUEUE_KEY = 'rema-offline-queue';

export const getOfflineQueue = async (): Promise<OfflineQueueItem[]> => {
    try {
        const queue = await get<OfflineQueueItem[]>(QUEUE_KEY);
        return queue || [];
    } catch (err) {
        console.error("Failed to read offline queue:", err);
        return [];
    }
};

export const enqueueOfflineAction = async (item: OfflineQueueItem) => {
    try {
        const queue = await getOfflineQueue();
        queue.push(item);
        await set(QUEUE_KEY, queue);
    } catch (err) {
        console.error("Failed to enqueue offline action:", err);
        throw new Error('Gagal menyimpan ke antrean offline. Pastikan memori perangkat cukup.');
    }
};

export const dequeueOfflineAction = async (id: string) => {
    try {
        const queue = await getOfflineQueue();
        const newQueue = queue.filter(item => item.id !== id);
        await set(QUEUE_KEY, newQueue);
    } catch (err) {
        console.error("Failed to dequeue offline action:", err);
    }
};

export const clearOfflineQueue = async () => {
    try {
        await set(QUEUE_KEY, []);
    } catch (err) {
        console.error("Failed to clear offline queue:", err);
    }
};
