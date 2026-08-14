import { onValue, push, ref, update } from 'firebase/database';

import { getFirebaseDatabase } from '../config/firebase';
import type { AppNotification } from '../types';

export function listenNotifications(
  userId: string,
  onChange: (items: AppNotification[]) => void,
): () => void {
  const notificationsRef = ref(getFirebaseDatabase(), 'notifications');
  return onValue(notificationsRef, (snapshot) => {
    const value = snapshot.val() as Record<string, Omit<AppNotification, 'notificationId'>> | null;
    const items = value
      ? Object.entries(value)
          .map(([notificationId, item]) => ({ ...item, notificationId }))
          .filter((item) => item.userId === userId)
          .sort((a, b) => b.createdTime - a.createdTime)
      : [];
    onChange(items);
  });
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
  await push(ref(getFirebaseDatabase(), 'notifications'), payload);
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  await update(ref(getFirebaseDatabase(), `notifications/${notificationId}`), { isRead: true });
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
