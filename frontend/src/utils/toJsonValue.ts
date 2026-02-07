import type { Json } from '@/types/supabase';
import { isRecord } from './recordNarrowing';

export const toJsonValue = (value: unknown): Json => {
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(item => toJsonValue(item));
  }

  if (isRecord(value)) {
    const output: { [key: string]: Json | undefined } = {};
    Object.entries(value).forEach(([key, entry]) => {
      output[key] = toJsonValue(entry);
    });
    return output;
  }

  return null;
};
