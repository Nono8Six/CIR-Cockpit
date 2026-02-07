const SOURCE_PATTERN = /^[A-Za-z][A-Za-z0-9]*(\.[A-Za-z][A-Za-z0-9]*)+$/;
const LEGACY_DOMAIN_PATTERN = /^[a-z][a-z0-9]*$/;

export const isValidErrorSource = (source: string): boolean => SOURCE_PATTERN.test(source);

const sanitizeSource = (source: string): string => {
  return source
    .trim()
    .replace(/[^A-Za-z0-9.]+/g, '.')
    .replace(/\.{2,}/g, '.')
    .replace(/^\.+|\.+$/g, '');
};

export const normalizeErrorSource = (
  source: unknown,
  fallback = 'unknown.unknown'
): string => {
  if (typeof source !== 'string') {
    return fallback;
  }

  const sanitized = sanitizeSource(source);
  if (isValidErrorSource(sanitized)) {
    return sanitized;
  }

  if (LEGACY_DOMAIN_PATTERN.test(sanitized)) {
    return `${sanitized}.unknown`;
  }

  return fallback;
};

