import { useEffect, useState } from 'react';

export const DEFAULT_DEBOUNCE_MS = 300;

/**
 * Returns a copy of `value` that only updates after it has stopped changing for
 * `delayMs`. Used to debounce server-driven search inputs: the raw value keeps
 * the input responsive while the debounced value keys the query.
 */
export const useDebouncedValue = <T,>(value: T, delayMs: number = DEFAULT_DEBOUNCE_MS): T => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debouncedValue;
};
