import { describe, expect, it } from 'vitest';

import { validateDashboardSearch } from '@/app/dashboardSearch';

describe('validateDashboardSearch', () => {
  it('keeps a requested interaction identifier', () => {
    expect(validateDashboardSearch({ interactionId: 'interaction-1' })).toEqual({ interactionId: 'interaction-1' });
  });

  it('drops unknown search parameters', () => {
    expect(validateDashboardSearch({ unexpected: 'value' })).toEqual({});
  });
});
