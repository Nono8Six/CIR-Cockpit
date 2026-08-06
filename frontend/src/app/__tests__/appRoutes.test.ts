import { describe, expect, it } from 'vitest';

import { buildShellNavigation } from '@/app/appConstants';
import {
  getPathForTab,
  getTabFromPathname,
  isInteractionTab,
  isRealtimeInteractionTab,
  isShellNavItemActive
} from '@/app/appRoutes';
import { validatePricingReferentialsSearch } from '@/app/pricingReferentialsSearch';

describe('appRoutes', () => {
  it('maps tabs to expected business URLs', () => {
    expect(getPathForTab('cockpit')).toBe('/cockpit');
    expect(getPathForTab('dashboard')).toBe('/dashboard');
    expect(getPathForTab('clients')).toBe('/clients');
    expect(getPathForTab('suppliers')).toBe('/suppliers');
    expect(getPathForTab('referentials')).toBe('/remises/referentiels');
    expect(getPathForTab('configurators')).toBe('/configurateurs/moteurs');
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

  it('rattache toute la racine Configurateurs au même onglet', () => {
    expect(getTabFromPathname('/configurateurs')).toBe('configurators');
    expect(getTabFromPathname('/configurateurs/')).toBe('configurators');
    expect(getTabFromPathname('/configurateurs/moteurs')).toBe('configurators');
    expect(getTabFromPathname('/configurateurs/moteurs/remplacement')).toBe('configurators');
    expect(getTabFromPathname('/configurateurs/mes-configurations')).toBe('configurators');
  });

  it('garde l’entrée Configurateurs active sur les configurations transverses', () => {
    const items = buildShellNavigation(true, 0).flatMap((section) => section.items);
    const configuratorsItem = items.find((item) => item.id === 'configurators');

    expect(configuratorsItem).toBeDefined();
    expect(
      isShellNavItemActive(configuratorsItem!, 'configurators', '/configurateurs/moteurs')
    ).toBe(true);
    expect(
      isShellNavItemActive(
        configuratorsItem!,
        'configurators',
        '/configurateurs/mes-configurations'
      )
    ).toBe(true);
    expect(isShellNavItemActive(configuratorsItem!, 'clients', '/clients')).toBe(false);
  });

  it('expose Configurateurs à tous les rôles, sans droit d’administration', () => {
    const sectionsForTcs = buildShellNavigation(false, 0);
    const configuratorsSection = sectionsForTcs.find((section) => section.id === 'configurators');

    expect(configuratorsSection).toBeDefined();
    expect(configuratorsSection?.items.map((item) => item.id)).toEqual(['configurators']);
  });

  it('flags interaction tabs used by state view gate', () => {
    expect(isInteractionTab('cockpit')).toBe(true);
    expect(isInteractionTab('dashboard')).toBe(true);
    expect(isInteractionTab('settings')).toBe(true);
    expect(isInteractionTab('clients')).toBe(false);
    expect(isInteractionTab('suppliers')).toBe(false);
    expect(isInteractionTab('referentials')).toBe(false);
    expect(isInteractionTab('configurators')).toBe(false);
    expect(isInteractionTab('admin')).toBe(false);
  });

  it('limite les abonnements temps réel aux écrans qui affichent les interactions', () => {
    expect(isRealtimeInteractionTab('cockpit')).toBe(true);
    expect(isRealtimeInteractionTab('dashboard')).toBe(true);
    expect(isRealtimeInteractionTab('settings')).toBe(false);
    expect(isRealtimeInteractionTab('clients')).toBe(false);
    expect(isRealtimeInteractionTab('suppliers')).toBe(false);
    expect(isRealtimeInteractionTab('referentials')).toBe(false);
    expect(isRealtimeInteractionTab('configurators')).toBe(false);
    expect(isRealtimeInteractionTab('admin')).toBe(false);
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
