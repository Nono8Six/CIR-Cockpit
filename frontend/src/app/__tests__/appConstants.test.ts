import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  getSearchShortcutLabel,
  getSidebarToggleShortcutLabel,
  isSidebarToggleShortcut
} from '@/app/appConstants';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('platform shortcut labels', () => {
  it('renders Command labels on Apple platforms', () => {
    vi.spyOn(window.navigator, 'platform', 'get').mockReturnValue('MacIntel');

    expect(getSearchShortcutLabel()).toBe('\u2318 K');
    expect(getSidebarToggleShortcutLabel()).toBe('\u2318 B');
  });

  it('renders Ctrl labels on non-Apple platforms', () => {
    vi.spyOn(window.navigator, 'platform', 'get').mockReturnValue('Win32');

    expect(getSearchShortcutLabel()).toBe('Ctrl K');
    expect(getSidebarToggleShortcutLabel()).toBe('Ctrl B');
  });
});

describe('isSidebarToggleShortcut', () => {
  it('matches the primary Ctrl or Command+B shortcut', () => {
    expect(
      isSidebarToggleShortcut({
        key: 'b',
        code: 'KeyB',
        ctrlKey: true,
        metaKey: false,
        altKey: false
      })
    ).toBe(true);

    expect(
      isSidebarToggleShortcut({
        key: 'B',
        code: 'KeyB',
        ctrlKey: false,
        metaKey: true,
        altKey: false
      })
    ).toBe(true);
  });

  it('supports the layout-safe Backslash shortcut alias and ignores invalid combos', () => {
    expect(
      isSidebarToggleShortcut({
        key: '\\',
        code: 'Backslash',
        ctrlKey: true,
        metaKey: false,
        altKey: false
      })
    ).toBe(true);

    expect(
      isSidebarToggleShortcut({
        key: 'b',
        code: 'KeyB',
        ctrlKey: false,
        metaKey: false,
        altKey: false
      })
    ).toBe(false);

    expect(
      isSidebarToggleShortcut({
        key: 'b',
        code: 'KeyB',
        ctrlKey: true,
        metaKey: false,
        altKey: true
      })
    ).toBe(false);
  });
});
