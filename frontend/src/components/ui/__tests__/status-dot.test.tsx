import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import StatusDot from '../status-dot';

describe('StatusDot', () => {
  it('renders green for active client', () => {
    render(<StatusDot entityType="Client" archivedAt={null} />);
    const dot = screen.getByRole('img', { name: 'Client actif' });
    expect(dot.className).toContain('bg-emerald-500');
  });

  it('renders blue for active prospect', () => {
    render(<StatusDot entityType="Prospect" archivedAt={null} />);
    const dot = screen.getByRole('img', { name: 'Prospect actif' });
    expect(dot.className).toContain('bg-blue-500');
  });

  it('renders amber for archived client', () => {
    render(<StatusDot entityType="Client" archivedAt="2026-01-01T00:00:00Z" />);
    const dot = screen.getByRole('img', { name: 'Archivé' });
    expect(dot.className).toContain('bg-amber-400');
  });

  it('renders amber for archived prospect', () => {
    render(<StatusDot entityType="Prospect" archivedAt="2026-01-01T00:00:00Z" />);
    const dot = screen.getByRole('img', { name: 'Archivé' });
    expect(dot.className).toContain('bg-amber-400');
  });
});
