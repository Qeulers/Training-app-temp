import { useEffect, useState } from 'react';

/*
 * Detect the on-screen (soft) keyboard on mobile via the VisualViewport API.
 * When the keyboard opens the visual viewport shrinks while the layout viewport
 * (window.innerHeight) stays put, so a large gap between the two means the
 * keyboard is up. Used to hide the sticky rest timer while entering weights/reps.
 * Feature-detected and non-fatal — returns false where visualViewport is absent
 * (most desktops), so the timer simply stays visible.
 */
const KEYBOARD_MIN_PX = 120; // ignore browser-chrome jitter; real keyboards are taller

export function useKeyboardOpen(): boolean {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const onResize = () => setOpen(window.innerHeight - vv.height > KEYBOARD_MIN_PX);

    vv.addEventListener('resize', onResize);
    onResize();
    return () => vv.removeEventListener('resize', onResize);
  }, []);

  return open;
}
