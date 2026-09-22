import * as React from 'react';
import { useScoped } from '../state/app-state';

/** Shows the newest unread notification for a few seconds when it arrives. */
export function useArrivalToast() {
  const { inbox } = useScoped();
  const seen = React.useRef<Set<string> | null>(null);
  const [toast, setToast] = React.useState<{ id: string; title: string; body: string; eventId: string } | null>(null);
  React.useEffect(() => {
    const ids = new Set(inbox.map((n) => n.id));
    const fresh = seen.current ? inbox.find((n) => n.unread && !seen.current!.has(n.id)) : undefined;
    seen.current = ids;
    if (!fresh) return;
    setToast(fresh);
    const timer = window.setTimeout(() => setToast(null), 6000);
    return () => window.clearTimeout(timer);
  }, [inbox]);
  return { toast, dismiss: () => setToast(null) };
}
