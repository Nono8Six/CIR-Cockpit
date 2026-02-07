import { AppError } from './types.ts';

const hashString = (value: string): string => {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
};

export const createErrorFingerprint = (
  error: Pick<AppError, 'code' | 'domain' | 'source' | 'status'>,
  salt?: string
): string => {
  const domain = error.domain ?? error.source ?? 'unknown';
  const status = error.status ?? '';
  const suffix = salt ? `|${salt}` : '';
  const key = `${error.code}|${domain}|${status}${suffix}`;
  return `err_${hashString(key)}`;
};
