import { useCallback, useEffect, useRef, useState } from 'react';

/** Only a newly confirmed operation can start or restart the three-second toast. */
export function useSaveToast() {
  const confirmed = useRef(new Set<string>());
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [operationId, setOperationId] = useState('');
  const [announcementOperationId, setAnnouncementOperationId] = useState('');
  useEffect(() => () => clearTimeout(timer.current), []);
  const confirm = useCallback((id: string) => {
    if (confirmed.current.has(id)) return;
    confirmed.current.add(id);
    clearTimeout(timer.current);
    setOperationId(id);
    setAnnouncementOperationId(id);
    timer.current = setTimeout(() => setOperationId(''), 3000);
  }, []);
  return { operationId, announcementOperationId, confirm };
}
