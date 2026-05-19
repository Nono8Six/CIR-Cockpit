import { describe, expect, it } from 'vitest';

import { getVisibleGuidedAnswerSteps } from '@/components/cockpit/guided/CockpitGuidedEntry';
import type { CockpitFormLeftPaneProps } from '@/components/cockpit/CockpitPaneTypes';
import type { CockpitGuidedStep } from '../../../../hooks/cockpit/useCockpitGuidedFlow';
import type { EntityContact } from '@/types';

const buildFlow = (activeStep: CockpitGuidedStep) => ({
  activeStep,
  isChannelConfirmed: true,
  isRelationConfirmed: true,
  identityComplete: true,
  contactComplete: true,
  subjectComplete: true
});

const buildLeftPaneProps = (overrides: Partial<CockpitFormLeftPaneProps> = {}) => ({
  relationMode: 'supplier',
  selectedContact: null,
  selectedContactMeta: '',
  contactFirstName: '',
  contactLastName: '',
  contactName: '',
  contactPhone: '',
  contactEmail: '',
  ...overrides
}) as CockpitFormLeftPaneProps;

const buildContact = (): EntityContact => ({
  id: 'contact-1',
  entity_id: 'supplier-1',
  first_name: 'Claire',
  last_name: 'Durand',
  phone: null,
  email: null,
  position: null,
  notes: null,
  archived_at: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z'
});

describe('getVisibleGuidedAnswerSteps', () => {
  it('affiche uniquement les etapes precedentes validees', () => {
    const props = buildLeftPaneProps();

    expect(getVisibleGuidedAnswerSteps(buildFlow('channel'), props)).toEqual([]);
    expect(getVisibleGuidedAnswerSteps(buildFlow('relation'), props)).toEqual(['channel']);
    expect(getVisibleGuidedAnswerSteps(buildFlow('search'), props)).toEqual(['channel', 'relation']);
    expect(getVisibleGuidedAnswerSteps(buildFlow('contact'), props)).toEqual(['channel', 'relation', 'search']);
  });

  it('ne remonte pas un contact fournisseur par defaut quand aucun contact nominatif n existe', () => {
    expect(getVisibleGuidedAnswerSteps(buildFlow('subject'), buildLeftPaneProps({
      contactPhone: '06 11 22 33 44'
    }))).toEqual(['channel', 'relation', 'search']);
  });

  it('remonte le contact quand un contact fournisseur a ete choisi', () => {
    expect(getVisibleGuidedAnswerSteps(buildFlow('subject'), buildLeftPaneProps({
      selectedContact: buildContact()
    }))).toEqual(['channel', 'relation', 'search', 'contact']);
  });

  it('affiche tous les elements reellement completes a la validation', () => {
    expect(getVisibleGuidedAnswerSteps(buildFlow('details'), buildLeftPaneProps({
      selectedContact: buildContact()
    }))).toEqual(['channel', 'relation', 'search', 'contact', 'subject']);
  });
});
