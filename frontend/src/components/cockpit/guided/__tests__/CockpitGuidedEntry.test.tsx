import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import CockpitGuidedEntry, { getVisibleGuidedAnswerSteps } from '@/components/cockpit/guided/CockpitGuidedEntry';
import type { CockpitFormLeftPaneProps, CockpitFormRightPaneProps } from '@/components/cockpit/CockpitPaneTypes';
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

const renderClientContactStep = (focusFirstInvalidField = vi.fn()) => {
  const clientContact = { ...buildContact(), entity_id: 'entity-1' };

  render(
    <CockpitGuidedEntry
      formId="interaction-form"
      canSave={false}
      gateMessage={null}
      focusCurrentStep={vi.fn()}
      focusFirstInvalidField={focusFirstInvalidField}
      leftPaneProps={{
        relationMode: 'client',
        entityType: 'Client',
        channel: 'Téléphone',
        errors: { contact_id: { type: 'custom', message: 'Contact requis' } },
        selectedEntity: { id: 'entity-1', name: 'SEA Aquitaine', entity_type: 'Client' },
        selectedContact: null,
        selectedEntityMeta: '',
        selectedContactMeta: '',
        contacts: [clientContact],
        contactsLoading: false,
        onContactSelect: vi.fn(),
        contactSelectRef: { current: null },
        onOpenContactDialog: vi.fn(),
        onClearSelectedContact: vi.fn(),
        companyName: 'SEA Aquitaine',
        companyCity: 'Gradignan',
        contactFirstName: '',
        contactLastName: '',
        contactPosition: '',
        contactName: '',
        contactPhone: '',
        contactEmail: '',
        interactionType: '',
        contactService: '',
        setValue: vi.fn()
      } as unknown as CockpitFormLeftPaneProps}
      rightPaneProps={{
        errors: {},
        statusValue: '',
        subject: '',
        megaFamilies: [],
        requiresProductFamilies: false,
        onReset: vi.fn()
      } as unknown as CockpitFormRightPaneProps}
      clientContextInteractions={[]}
      clientContextInteractionsTotal={0}
      isClientContextInteractionsLoading={false}
      hasClientContextInteractionsError={false}
    />
  );
};

describe('CockpitGuidedEntry - affichage des erreurs de validation', () => {
  it('n affiche aucune erreur au montage de l etape contact', () => {
    renderClientContactStep();

    expect(screen.getByRole('button', { name: /claire durand/i })).toBeInTheDocument();
    expect(screen.queryByText('Contact requis')).not.toBeInTheDocument();
  });

  it('affiche l erreur et demande le focus apres un clic sur Continuer', async () => {
    const user = userEvent.setup();
    const focusFirstInvalidField = vi.fn();
    renderClientContactStep(focusFirstInvalidField);

    await user.click(screen.getByRole('button', { name: /continuer/i }));

    expect(screen.getByText('Contact requis')).toBeInTheDocument();
    expect(focusFirstInvalidField).toHaveBeenCalledTimes(1);
  });
});

describe('CockpitGuidedEntry - dispositif de progression unique', () => {
  it('porte la valeur choisie dans le stepper sans recapitulatif ni bloc etape', () => {
    renderClientContactStep();

    expect(screen.getByRole('navigation', { name: /progression de la saisie/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^canal téléphone$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^tiers sea aquitaine$/i })).toBeInTheDocument();
    expect(screen.queryByText(/^étape \d$/i)).not.toBeInTheDocument();
  });

  it('permet de revenir sur une etape franchie depuis le stepper', async () => {
    const user = userEvent.setup();
    renderClientContactStep();

    await user.click(screen.getByRole('button', { name: /^canal téléphone$/i }));

    expect(screen.getByRole('heading', { name: /par quel canal avez-vous échangé/i })).toBeInTheDocument();
  });

  it('laisse les etapes non franchies non cliquables', () => {
    renderClientContactStep();

    expect(screen.getByRole('button', { name: /^validation$/i })).toBeDisabled();
  });
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
