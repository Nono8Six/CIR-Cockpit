import { useEffect, useState } from 'react';

/**
 * Compte les secondes reellement ecoulees depuis l'activation.
 *
 * Sert a rendre lisible une attente longue (les equivalences durent 5,7 a 7,1 s
 * en runtime distant) sans jamais afficher de progression fictive : on montre le
 * temps constate, pas un pourcentage inventé.
 */
export const useElapsedSeconds = (active: boolean): number => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!active) {
      return;
    }

    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);

    return () => {
      window.clearInterval(timer);
      setElapsedSeconds(0);
    };
  }, [active]);

  return active ? elapsedSeconds : 0;
};

export const formatElapsedSeconds = (elapsedSeconds: number): string => {
  const safeSeconds = Math.max(0, Math.floor(elapsedSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};
