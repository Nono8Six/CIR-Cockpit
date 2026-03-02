import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { axe } from 'vitest-axe';

import LoginScreen from '@/components/LoginScreen';

describe('LoginScreen accessibility', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<LoginScreen />);
    const results = await axe(container);
    expect(results.violations).toHaveLength(0);
  });
});
