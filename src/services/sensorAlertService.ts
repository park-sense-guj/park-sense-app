import { get, ref } from 'firebase/database';

import { getFirebaseDatabase } from '../config/firebase';
import type { UserProfile } from '../types';
import { createNotification } from './notificationService';

export async function notifyAdminsSensorFault(input: {
  slotNumber: string;
  slotId: string;
  sensorId: string;
}): Promise<void> {
  const snapshot = await get(ref(getFirebaseDatabase(), 'users'));
  const users = (snapshot.val() as Record<string, UserProfile> | null) ?? {};
  const admins = Object.values(users).filter((user) => user.role === 'admin');
  if (admins.length === 0) {
    return;
  }
  await Promise.all(
    admins.map((admin) =>
      createNotification({
        userId: admin.userId,
        slotId: input.slotId,
        message: `Sensor offline: ${input.slotNumber} (${input.sensorId}) was marked faulty. Drivers still see a grey Offline pin until it’s healthy again.`,
      }),
    ),
  );
}

export async function notifyAdminsSensorRestored(input: {
  slotNumber: string;
  slotId: string;
}): Promise<void> {
  const snapshot = await get(ref(getFirebaseDatabase(), 'users'));
  const users = (snapshot.val() as Record<string, UserProfile> | null) ?? {};
  const admins = Object.values(users).filter((user) => user.role === 'admin');
  if (admins.length === 0) {
    return;
  }
  await Promise.all(
    admins.map((admin) =>
      createNotification({
        userId: admin.userId,
        slotId: input.slotId,
        message: `Sensor restored: ${input.slotNumber} is healthy again and visible on the driver map.`,
      }),
    ),
  );
}
