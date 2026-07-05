import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  getSearchShortcutLabel,
  SEARCH_SHORTCUT_ARIA
} from '@/app/appConstants';
import AppHeaderSearchButton from '@/components/app-header/AppHeaderSearchButton';

describe('AppHeaderSearchButton', () => {
  it('renders the shortcut keycap and exposes aria-keyshortcuts', () => {
    vi.spyOn(window.navigator, 'platform', 'get').mockReturnValue('Win32');

    render(<AppHeaderSearchButton onOpenSearch={vi.fn()} />);

    const button = screen.getByRole('button', { name: /ouvrir la recherche rapide/i });

    expect(button).toHaveAttribute(
      'aria-keyshortcuts',
      SEARCH_SHORTCUT_ARIA
    );
    expect(button).toHaveClass('h-8', 'w-8', 'rounded-lg', 'lg:w-[17.5rem]');
    expect(screen.getByText(getSearchShortcutLabel())).toBeInTheDocument();
  });

  it('keeps compact mode icon-only at the shell control size', () => {
    render(<AppHeaderSearchButton onOpenSearch={vi.fn()} isCompact />);

    const button = screen.getByRole('button', { name: /ouvrir la recherche rapide/i });

    expect(button).toHaveClass('h-8', 'w-8', 'rounded-lg');
    expect(button.className).not.toContain('lg:w-[17.5rem]');
    expect(screen.queryByTestId('app-header-search-label')).not.toBeInTheDocument();
  });

  it('keeps the search intent prefetch hooks wired', () => {
    const onSearchIntent = vi.fn();

    render(
      <AppHeaderSearchButton
        onOpenSearch={vi.fn()}
        onSearchIntent={onSearchIntent}
      />
    );

    const button = screen.getByRole('button', { name: /ouvrir la recherche rapide/i });

    fireEvent.focus(button);
    fireEvent.pointerDown(button);

    expect(onSearchIntent).toHaveBeenCalledTimes(2);
  });
});
