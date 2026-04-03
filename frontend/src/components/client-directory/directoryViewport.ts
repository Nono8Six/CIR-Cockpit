export const MOBILE_DIRECTORY_QUERY = '(max-width: 639px)';

const matchesMediaQuery = (query: string): boolean =>
  typeof window !== 'undefined'
  && typeof window.matchMedia === 'function'
  && window.matchMedia(query).matches;

export const getIsMobileDirectoryViewport = (): boolean =>
  matchesMediaQuery(MOBILE_DIRECTORY_QUERY);
