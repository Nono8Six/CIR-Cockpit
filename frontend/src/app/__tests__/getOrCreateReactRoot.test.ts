import type { Root } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';

import { getOrCreateReactRoot } from '@/app/getOrCreateReactRoot';

describe('getOrCreateReactRoot', () => {
  it('réutilise le même root lorsque le point d’entrée est réévalué par HMR', () => {
    const container = document.createElement('div');
    const root = { render: vi.fn(), unmount: vi.fn() } as unknown as Root;
    const createRoot = vi.fn(() => root);

    expect(getOrCreateReactRoot(container, createRoot)).toBe(root);
    expect(getOrCreateReactRoot(container, createRoot)).toBe(root);
    expect(createRoot).toHaveBeenCalledTimes(1);
    expect(createRoot).toHaveBeenCalledWith(container);
  });
});
