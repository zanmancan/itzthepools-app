// hooks/useLoadingDelay.ts
import { useEffect, useState } from "react";

/**
 * Prevents instant spinner flashes.
 * Shows loading UI only if `loading` stays true ≥ delayMs (default 250ms).
 */
export function useLoadingDelay(loading: boolean, delayMs = 250) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!loading) {
      setShow(false);
      return;
    }
    const t = setTimeout(() => setShow(true), delayMs);
    return () => clearTimeout(t);
  }, [loading, delayMs]);

  return show;
}
