'use client';

import { useEffect, useState } from 'react';

/**
 * Whether the viewport is wide enough for the three-column panel.
 *
 * Decided in JS rather than by hiding one of two copies with CSS: the ticket is
 * a stack of buttons, and rendering it twice would put every one of them in the
 * accessibility tree twice. Starts false so the server and the first client
 * paint agree, then corrects on mount — the phone layout is the honest default
 * for a product opened on a phone.
 */
export const useIsWide = (query = '(min-width: 1100px)'): boolean => {
  const [wide, setWide] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    const sync = (): void => setWide(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, [query]);

  return wide;
};
