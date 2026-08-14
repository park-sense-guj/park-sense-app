import { useEffect, useMemo, useState } from 'react';

import { listenParkingHistory } from '../services/historyService';
import type { ParkingHistory } from '../types';

export function useParkingHistory(userId?: string) {
  const [items, setItems] = useState<ParkingHistory[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      return;
    }
    return listenParkingHistory(
      userId,
      (next) => {
        setItems(next);
        setReady(true);
        setError(null);
      },
      (err) => {
        setReady(true);
        setError(err.message || 'Could not load activity.');
      },
    );
  }, [userId]);

  const resolvedItems = userId ? items : [];
  const resolvedReady = userId ? ready : true;
  const resolvedError = userId ? error : null;
  const activeSession = useMemo(
    () => resolvedItems.find((item) => !item.exitTime) ?? null,
    [resolvedItems],
  );

  return {
    items: resolvedItems,
    ready: resolvedReady,
    error: resolvedError,
    activeSession,
  };
}
