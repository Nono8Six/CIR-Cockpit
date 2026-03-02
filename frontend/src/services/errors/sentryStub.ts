import { setErrorReporter } from '@/services/errors/reportError';

export const initErrorReporter = (isDev: boolean = import.meta.env.DEV): void => {
  if (!isDev) {
    return;
  }

  setErrorReporter((error) => {
    const code =
      typeof error === 'object'
      && error !== null
      && 'code' in error
      && typeof error.code === 'string'
        ? error.code
        : 'UNKNOWN_ERROR';

    console.groupCollapsed(`[ErrorReporter] ${code}`);
    console.dir(error);
    console.groupEnd();
  });
};
