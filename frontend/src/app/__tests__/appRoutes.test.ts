import { describe, expect, it } from 'vitest';

import { buildShellNavigation } from '@/app/appConstants';
import { getPathForTab, getTabFromPathname, isInteractionTab, isShellNavItemActive } from '@/app/appRoutes';
import { validatePricingReferentialsSearch } from '@/app/pricingReferentialsSearch';

describe('appRoutes', () => {
  it('maps tabs to expected business URLs', () => {
    expect(getPathForTab('cockpit')).toBe('/cockpit');
    expect(getPathForTab('dashboard')).toBe('/dashboard');
    expect(getPathForTab('clients')).toBe('/clients');
    expect(getPathForTab('suppliers')).toBe('/suppliers');
    expect(getPathForTab('referentials')).toBe('/remises/referentiels');
    expect(getPathForTab('admin')).toBe('/admin');
    expect(getPathForTab('settings')).toBe('/settings');
  });

  it('resolves tab from pathname with fallbacks', () => {
    expect(getTabFromPathname('/cockpit')).toBe('cockpit');
    expect(getTabFromPathname('/dashboard')).toBe('dashboard');
    expect(getTabFromPathname('/clients/')).toBe('clients');
    expect(getTabFromPathname('/suppliers/supplier-1')).toBe('suppliers');
    expect(getTabFromPathname('/remises')).toBe('referentials');
    expect(getTabFromPathname('/remises/referentiels')).toBe('referentials');
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
    expect(isInteractionTab('suppliers')).toBe(false);
    expect(isInteractionTab('referentials')).toBe(false);
    expect(isInteractionTab('admin')).toBe(false);
  });

  it('treats the root URL as the cockpit shell item', () => {
    const items = buildShellNavigation(true, 0).flatMap((section) => section.items);
    const cockpitItem = items.find((item) => item.id === 'cockpit');
    const clientsItem = items.find((item) => item.id === 'clients');

    expect(cockpitItem).toBeDefined();
    expect(clientsItem).toBeDefined();

    expect(isShellNavItemActive(cockpitItem!, 'cockpit', '/')).toBe(true);
    expect(isShellNavItemActive(clientsItem!, 'cockpit', '/')).toBe(false);
  });

  it('validates the pricing referentials tab search param', () => {
    expect(validatePricingReferentialsSearch({ tab: 'imports' })).toEqual({ tab: 'imports' });
    expect(validatePricingReferentialsSearch({ tab: 'classification' })).toEqual({ tab: 'classification' });
    expect(validatePricingReferentialsSearch({ tab: 'segments' })).toEqual({ tab: 'segments' });
    expect(validatePricingReferentialsSearch({ tab: 'anomalies' })).toEqual({ tab: 'anomalies' });
  });

  it('falls back to an empty search state for removed pricing referentials tabs', () => {
    expect(validatePricingReferentialsSearch({ tab: 'links' })).toEqual({});
    expect(validatePricingReferentialsSearch({ tab: 'history' })).toEqual({});
    expect(validatePricingReferentialsSearch({ tab: 'unknown' })).toEqual({});
  });
});
