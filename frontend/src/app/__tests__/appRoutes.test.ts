import { describe, expect, it } from 'vitest';

import { getPathForTab, getTabFromPathname, isInteractionTab } from '@/app/appRoutes';

describe('appRoutes', () => {
  it('maps tabs to expected business URLs', () => {
    expect(getPathForTab('cockpit')).toBe('/cockpit');
    expect(getPathForTab('dashboard')).toBe('/dashboard');
    expect(getPathForTab('clients')).toBe('/clients');
    expect(getPathForTab('admin')).toBe('/admin');
    expect(getPathForTab('settings')).toBe('/settings');
  });

  it('resolves tab from pathname with fallbacks', () => {
    expect(getTabFromPathname('/cockpit')).toBe('cockpit');
    expect(getTabFromPathname('/dashboard')).toBe('dashboard');
    expect(getTabFromPathname('/clients/')).toBe('clients');
    expect(getTabFromPathname('/admin')).toBe('admin');
    expect(getTabFromPathname('/settings')).toBe('settings');
    expect(getTabFromPathname('/')).toBe('cockpit');
    expect(getTabFromPathname('/unknown')).toBe('cockpit');
  });

  it('flags interaction tabs used by state view gate', () => {
    expect(isInteractionTab('cockpit')).toBe(true);
    expect(isInteractionTab('dashboard')).toBe(true);
    expect(isInteractionTab('settings')).toBe(true);
    expect(isInteractionTab('clients')).toBe(false);
    expect(isInteractionTab('admin')).toBe(false);
  });
});
