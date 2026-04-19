import { useEffect, useState } from 'react';

export const UI_MODE_STORAGE_KEY = 'cir_ui_mode';

export type UiMode = 'v1' | 'v2';

type ResolveUiModeParams = {
  search: string;
  storedMode: string | null;
  defaultEnabled: boolean;
};

type ResolveUiModeResult = {
  mode: UiMode;
  persistedMode: UiMode | null;
};

export const parseUiMode = (value: string | null | undefined): UiMode | null => {
  if (value === 'v1' || value === 'v2') return value;
  return null;
};

export const resolveUiMode = ({
  search,
  storedMode,
  defaultEnabled
}: ResolveUiModeParams): ResolveUiModeResult => {
  const queryMode = parseUiMode(new URLSearchParams(search).get('ui'));
  if (queryMode) {
    return {
      mode: queryMode,
      persistedMode: queryMode
    };
  }

  const savedMode = parseUiMode(storedMode);
  if (savedMode) {
    return {
      mode: savedMode,
      persistedMode: null
    };
  }

  return {
    mode: defaultEnabled ? 'v2' : 'v1',
    persistedMode: null
  };
};

type UseUiPocModeParams = {
  pathname: string;
  defaultEnabled?: boolean;
};

export const useUiPocMode = ({
  pathname,
  defaultEnabled = false
}: UseUiPocModeParams) => {
  const [uiMode, setUiMode] = useState<UiMode>(() => (defaultEnabled ? 'v2' : 'v1'));

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const storedMode = window.localStorage.getItem(UI_MODE_STORAGE_KEY);
    const { mode, persistedMode } = resolveUiMode({
      search: window.location.search,
      storedMode,
      defaultEnabled
    });

    if (persistedMode) {
      window.localStorage.setItem(UI_MODE_STORAGE_KEY, persistedMode);
    }

    setUiMode(mode);
  }, [defaultEnabled, pathname]);

  return {
    uiMode,
    isV2: uiMode === 'v2'
  };
};
