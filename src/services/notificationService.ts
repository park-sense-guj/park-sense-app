import { onValue, push, ref, remove, update } from 'firebase/database';

import { getFirebaseDatabase } from '../config/firebase';
import type { AppNotification } from '../types';

export function listenNotifications(
  userId: string,
  onChange: (items: AppNotification[]) => void,
  onError?: (error: Error) => void,
): () => void {
  const notificationsRef = ref(getFirebaseDatabase(), `notifications/${userId}`);
  return onValue(
    notificationsRef,
    (snapshot) => {
      const value = snapshot.val() as Record<string, Omit<AppNotification, 'notificationId'>> | null;
      const items = value
        ? Object.entries(value)
            .map(([notificationId, item]) => ({ ...item, notificationId }))
            .sort((a, b) => b.createdTime - a.createdTime)
        : [];
      onChange(items);
    },
    (error) => onError?.(error),
  );
}

export async function createNotification(input: {
  userId: string;
  message: string;
  slotId?: string;
}): Promise<void> {
  const payload: Omit<AppNotification, 'notificationId'> = {
    userId: input.userId,
    message: input.message,
    createdTime: Date.now(),
    isRead: false,
    slotId: input.slotId,
  };
  await push(ref(getFirebaseDatabase(), `notifications/${input.userId}`), payload);
}

export async function markNotificationRead(userId: string, notificationId: string): Promise<void> {
  await update(ref(getFirebaseDatabase(), `notifications/${userId}/${notificationId}`), {
    isRead: true,
  });
}

export async function markAllNotificationsRead(
  userId: string,
  items: AppNotification[],
): Promise<void> {
  const unread = items.filter((item) => !item.isRead);
  if (unread.length === 0) {
    return;
  }
  const patch: Record<string, boolean> = {};
  for (const item of unread) {
    patch[`notifications/${userId}/${item.notificationId}/isRead`] = true;
  }
  await update(ref(getFirebaseDatabase()), patch);
}

export async function notifyUsersSlotAvailable(params: {
  userIds: string[];
  slotNumber: string;
  locationName: string;
  slotId: string;
}): Promise<void> {
  await Promise.all(
    params.userIds.map((userId) =>
      createNotification({
        userId,
        slotId: params.slotId,
        message: `Slot ${params.slotNumber} is now available at ${params.locationName}.`,
      }),
    ),
  );
}

export async function deleteUserNotifications(userId: string): Promise<void> {
  await remove(ref(getFirebaseDatabase(), `notifications/${userId}`));
}
