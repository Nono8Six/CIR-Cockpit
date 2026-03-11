import { describe, expect, it } from 'vitest';

import { isSidebarToggleShortcut } from '@/app/appConstants';

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
