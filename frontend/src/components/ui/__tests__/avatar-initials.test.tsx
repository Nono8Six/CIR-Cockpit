import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import AvatarInitials from '../avatar-initials';

describe('AvatarInitials', () => {
  it('renders initials from a two-word name', () => {
    render(<AvatarInitials name="Jean Dupont" />);
    expect(screen.getByText('JD')).toBeTruthy();
  });

  it('renders single initial from a one-word name', () => {
    render(<AvatarInitials name="Aster" />);
    expect(screen.getByText('A')).toBeTruthy();
  });

  it('falls back to a question mark when the name is empty', () => {
    render(<AvatarInitials name="   " />);
    expect(screen.getByText('?')).toBeTruthy();
  });

  it('returns deterministic color for the same name', () => {
    const { container: container1 } = render(<AvatarInitials name="Test User" />);
    const { container: container2 } = render(<AvatarInitials name="Test User" />);
    const className1 = container1.firstElementChild?.className ?? '';
    const className2 = container2.firstElementChild?.className ?? '';
    expect(className1).toBe(className2);
  });

  it('applies sm size by default', () => {
    const { container } = render(<AvatarInitials name="AB" />);
    expect(container.firstElementChild?.className).toContain('size-7');
  });

  it('applies md size when specified', () => {
    const { container } = render(<AvatarInitials name="AB" size="md" />);
    expect(container.firstElementChild?.className).toContain('size-9');
  });

  it('applies lg size when specified', () => {
    const { container } = render(<AvatarInitials name="AB" size="lg" />);
    expect(container.firstElementChild?.className).toContain('size-10');
  });

  it('merges a custom class name with the computed styles', () => {
    const { container } = render(<AvatarInitials name="AB" className="ring-1" />);
    expect(container.firstElementChild?.className).toContain('ring-1');
  });
});
