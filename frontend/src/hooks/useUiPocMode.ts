import { useEffect, useState } from 'react';

export const UI_MODE_STORAGE_KEY = 'cir_ui_mode';

export type UiMode = 'v1' | 'v2';

type ResolveUiModeParams = {
  search: string;
  storedMode: string | null;
  envFlag: string | boolean | null | undefined;
};

type ResolveUiModeResult = {
  mode: UiMode;
  persistedMode: UiMode | null;
};

export const parseUiMode = (value: string | null | undefined): UiMode | null => {
  if (value === 'v1' || value === 'v2') return value;
  return null;
};

export const isUiPocFlagEnabled = (value: string | boolean | null | undefined): boolean => {
  if (typeof value === 'boolean') return value;

  const normalized = (value ?? '').trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
};

export const resolveUiMode = ({
  search,
  storedMode,
  envFlag
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
    mode: isUiPocFlagEnabled(envFlag) ? 'v2' : 'v1',
    persistedMode: null
  };
};

type UseUiPocModeParams = {
  pathname: string;
  envFlag?: string | boolean | null | undefined;
};

export const useUiPocMode = ({
  pathname,
  envFlag = import.meta.env.VITE_UI_SHELL_V2_POC
}: UseUiPocModeParams) => {
  const [uiMode, setUiMode] = useState<UiMode>(() => (isUiPocFlagEnabled(envFlag) ? 'v2' : 'v1'));

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const storedMode = window.localStorage.getItem(UI_MODE_STORAGE_KEY);
    const { mode, persistedMode } = resolveUiMode({
      search: window.location.search,
      storedMode,
      envFlag
    });

    if (persistedMode) {
      window.localStorage.setItem(UI_MODE_STORAGE_KEY, persistedMode);
    }

    setUiMode(mode);
  }, [envFlag, pathname]);

  return {
    uiMode,
    isV2: uiMode === 'v2'
  };
};
