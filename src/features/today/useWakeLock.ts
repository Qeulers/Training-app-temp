import { useEffect, useRef } from 'react';

/*
 * Hold a screen wake lock while `active` is true. Wake locks are dropped by the
 * browser whenever the tab is backgrounded, so we re-acquire on `visibilitychange`
 * when the page comes back to the foreground. Feature-detected and fully
 * non-fatal — denial or an unsupported browser just means the screen may sleep.
 */
export function useWakeLock(active: boolean) {
  const sentinelRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;

    let cancelled = false;

    const acquire = async () => {
      try {
        const s = await navigator.wakeLock.request('screen');
        if (cancelled) {
          s.release().catch(() => {});
        } else {
          sentinelRef.current = s;
        }
      } catch {
        /* wake lock denied — non-fatal */
      }
    };

    const release = () => {
      sentinelRef.current?.release().catch(() => {});
      sentinelRef.current = null;
    };

    // Re-acquire when the tab returns to the foreground (the sentinel is auto-released while hidden).
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && !sentinelRef.current) acquire();
    };

    acquire();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      release();
    };
  }, [active]);
}
