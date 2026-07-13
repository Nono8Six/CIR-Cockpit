import type { Root } from 'react-dom/client';

type RootContainer = HTMLElement & {
  __cirReactRoot__?: Root;
};

type CreateRoot = (container: HTMLElement) => Root;

export const getOrCreateReactRoot = (container: HTMLElement, createRoot: CreateRoot): Root => {
  const persistentContainer = container as RootContainer;
  persistentContainer.__cirReactRoot__ ??= createRoot(container);
  return persistentContainer.__cirReactRoot__;
};
