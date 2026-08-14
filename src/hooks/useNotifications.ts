import { useEffect, useMemo, useState } from 'react';

import { listenNotifications } from '../services/notificationService';
import type { AppNotification } from '../types';

export function useNotifications(userId?: string) {
  const [items, setItems] = useState<AppNotification[]>([]);

  useEffect(() => {
    if (!userId) {
      return;
    }
    return listenNotifications(userId, setItems);
  }, [userId]);

  const visible = useMemo(() => (userId ? items : []), [userId, items]);
  const unreadCount = useMemo(() => visible.filter((item) => !item.isRead).length, [visible]);

  return { items: visible, unreadCount };
}
