import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import ErrorBoundary from '@/components/ErrorBoundary';

vi.mock('@/services/errors/handleUiError', () => ({
  handleUiError: vi.fn()
}));

const Boom = () => {
  throw new Error('boom');
};

describe('ErrorBoundary', () => {
  it('renders fallback UI when child throws', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Erreur inattendue/i)).toBeInTheDocument();
  });
});
