export const MOBILE_DIRECTORY_QUERY = '(max-width: 639px)';
export const DESKTOP_DIRECTORY_DRAWER_QUERY = '(min-width: 1280px)';

const matchesMediaQuery = (query: string): boolean =>
  typeof window !== 'undefined'
  && typeof window.matchMedia === 'function'
  && window.matchMedia(query).matches;

export const getIsMobileDirectoryViewport = (): boolean =>
  matchesMediaQuery(MOBILE_DIRECTORY_QUERY);

export const getIsDesktopDirectoryDrawerViewport = (): boolean =>
  matchesMediaQuery(DESKTOP_DIRECTORY_DRAWER_QUERY);
