import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useCockpitGuidedFlow } from '@/hooks/useCockpitGuidedFlow';

const buildParams = (overrides: Partial<Parameters<typeof useCockpitGuidedFlow>[0]> = {}) => ({
  relationMode: 'prospect' as const,
  entityType: '',
  selectedEntity: null,
  selectedContact: null,
  companyName: '',
  companyCity: '',
  contactFirstName: '',
  contactLastName: '',
  contactPosition: '',
  contactName: '',
  contactPhone: '',
  contactEmail: '',
  interactionType: '',
  contactService: '',
  statusValue: '',
  subject: '',
  ...overrides
});

describe('useCockpitGuidedFlow', () => {
  it('advances a prospect capture through the expected questions', () => {
    const { result, rerender } = renderHook((params) => useCockpitGuidedFlow(params), {
      initialProps: buildParams()
    });

    expect(result.current.activeStep).toBe('channel');

    act(() => result.current.completeStep('channel'));
    expect(result.current.activeStep).toBe('relation');

    rerender(buildParams({ entityType: 'Prospect / Particulier' }));
    expect(result.current.activeStep).toBe('search');

    rerender(buildParams({
      entityType: 'Prospect / Particulier',
      companyName: 'SEA Aquitaine',
      companyCity: 'Gradignan'
    }));
    expect(result.current.activeStep).toBe('contact');

    rerender(buildParams({
      entityType: 'Prospect / Particulier',
      companyName: 'SEA Aquitaine',
      companyCity: 'Gradignan',
      contactLastName: 'Dupont',
      contactPhone: '0102030405'
    }));
    expect(result.current.activeStep).toBe('qualification');

    rerender(buildParams({
      entityType: 'Prospect / Particulier',
      companyName: 'SEA Aquitaine',
      companyCity: 'Gradignan',
      contactLastName: 'Dupont',
      contactPhone: '0102030405',
      interactionType: 'Demande',
      contactService: 'Atelier',
      statusValue: 'status-1',
      subject: 'Piece jointe'
    }));
    expect(result.current.activeStep).toBe('details');
  });

  it('skips the separate contact question for solicitations', () => {
    const { result, rerender } = renderHook((params) => useCockpitGuidedFlow(params), {
      initialProps: buildParams({ relationMode: 'solicitation', entityType: 'Sollicitation' })
    });

    act(() => result.current.completeStep('channel'));
    rerender(buildParams({
      relationMode: 'solicitation',
      entityType: 'Sollicitation',
      companyName: 'SEA Aquitaine',
      contactPhone: '0102030405'
    }));

    expect(result.current.identityComplete).toBe(true);
    expect(result.current.contactComplete).toBe(true);
    expect(result.current.activeStep).toBe('qualification');
  });

  it('permet de confirmer Tout avant la recherche sans forcer un type de tiers', () => {
    const { result } = renderHook((params) => useCockpitGuidedFlow(params), {
      initialProps: buildParams()
    });

    act(() => result.current.completeStep('channel'));
    act(() => result.current.completeStep('relation'));

    expect(result.current.isRelationConfirmed).toBe(true);
    expect(result.current.activeStep).toBe('search');
    expect(result.current.identityComplete).toBe(false);
  });

  it('allows editing and resetting the guided state without clearing form values', () => {
    const { result } = renderHook((params) => useCockpitGuidedFlow(params), {
      initialProps: buildParams({ entityType: 'Client' })
    });

    act(() => result.current.completeStep('channel'));
    act(() => result.current.editStep('channel'));
    expect(result.current.activeStep).toBe('channel');

    act(() => result.current.resetFlow());
    expect(result.current.activeStep).toBe('channel');
    expect(result.current.isChannelConfirmed).toBe(false);
  });
});
