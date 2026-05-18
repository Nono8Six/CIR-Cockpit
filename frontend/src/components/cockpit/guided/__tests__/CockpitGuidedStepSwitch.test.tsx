import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { okAsync } from 'neverthrow';

import CockpitGuidedAnswerRow from '@/components/cockpit/guided/CockpitGuidedAnswerRow';
import CockpitGuidedStepSwitch from '@/components/cockpit/guided/CockpitGuidedStepSwitch';
import type { CockpitLeftEntitySectionsProps } from '@/components/cockpit/CockpitLeftEntitySectionsProps';
import type { CockpitFormLeftPaneProps, CockpitFormRightPaneProps } from '@/components/cockpit/CockpitPaneTypes';
import type { useCockpitGuidedFlow } from '@/hooks/useCockpitGuidedFlow';
import { saveEntityContact } from '@/services/entities/saveEntityContact';
import type { EntityContact } from '@/types';

type GuidedFlowState = ReturnType<typeof useCockpitGuidedFlow>;

const buildField = (name: string) => ({
  name,
  onChange: vi.fn(),
  onBlur: vi.fn(),
  ref: vi.fn()
});

vi.mock('@/hooks/useCockpitAgencyMembers', () => ({
  useCockpitAgencyMembers: () => ({
    data: {
      members: [
        {
          profile_id: 'profile-1',
          first_name: 'Arnaud',
          last_name: 'FERRON',
          display_name: 'Arnaud FERRON',
          email: 'a.ferron@cir.fr',
          role: 'TCS'
        }
      ]
    },
    isLoading: false
  }),
  useCockpitAgencyMembersByAgencyIds: (agencies: Array<{ id: string; name: string }>) => ({
    members: agencies.flatMap((agency) => [{
      profile_id: `profile-${agency.id}`,
      first_name: agency.id === 'agency-2' ? 'Claire' : 'Arnaud',
      last_name: agency.id === 'agency-2' ? 'Durand' : 'FERRON',
      display_name: agency.id === 'agency-2' ? 'Claire Durand' : 'Arnaud FERRON',
      email: agency.id === 'agency-2' ? 'c.durand@cir.fr' : 'a.ferron@cir.fr',
      role: 'TCS',
      agencyId: agency.id,
      agencyName: agency.name
    }]),
    isLoading: false,
    error: null
  })
}));

vi.mock('@/services/entities/saveEntityContact', () => ({
  saveEntityContact: vi.fn()
}));

vi.mock('@/services/query/queryInvalidation', () => ({
  invalidateClientContactsQuery: vi.fn()
}));

const buildFlow = (
  contactComplete: boolean,
  overrides: Partial<GuidedFlowState> = {}
): GuidedFlowState => ({
  activeStep: 'contact',
  completeStep: vi.fn(),
  editStep: vi.fn(),
  resetFlow: vi.fn(),
  isChannelConfirmed: true,
  isRelationConfirmed: true,
  identityComplete: true,
  contactComplete,
  qualificationComplete: false,
  subjectComplete: false,
  ...overrides
});

const entityProps = {
  contact: {
    selectedEntity: null,
    selectedContact: null,
    errors: {},
    relationMode: 'client',
    contactFirstNameField: buildField('contact_first_name'),
    contactLastNameField: buildField('contact_last_name'),
    contactFirstNameInputRef: { current: null },
    contactFirstName: '',
    contactLastName: '',
    onContactFirstNameChange: vi.fn(),
    onContactLastNameChange: vi.fn()
  }
} as unknown as CockpitLeftEntitySectionsProps;

const agencies = [
  {
    id: 'agency-1',
    name: 'CIR Toulouse'
  },
  {
    id: 'agency-2',
    name: 'CIR Bordeaux'
  }
];

const renderInternalContactStep = (setValue = vi.fn(), flow = buildFlow(false)) => {
  render(
    <CockpitGuidedStepSwitch
      flow={flow}
      leftPaneProps={{
        relationMode: 'internal',
        activeAgencyId: 'agency-1',
        agencies,
        setValue
      } as unknown as CockpitFormLeftPaneProps}
      rightPaneProps={{} as CockpitFormRightPaneProps}
      entityProps={{
        ...entityProps,
        contact: {
          ...entityProps.contact,
          relationMode: 'internal'
        }
      }}
      onReset={vi.fn()}
    />
  );
};

const renderSupplierContactStep = (
  flow = buildFlow(true),
  overrides: Partial<CockpitFormLeftPaneProps> = {}
) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });

  render(
    <QueryClientProvider client={queryClient}>
      <CockpitGuidedStepSwitch
        flow={flow}
        leftPaneProps={{
          relationMode: 'supplier',
          selectedEntity: {
            id: 'supplier-1',
            name: 'Siemens',
            entity_type: 'Fournisseur'
          },
          selectedContact: null,
          selectedContactMeta: '',
          contactsLoading: false,
          contacts: [
            {
              id: 'contact-1',
              entity_id: 'supplier-1',
              first_name: 'Claire',
              last_name: 'Durand',
              phone: '06 11 22 33 44',
              email: 'claire@example.com',
              position: 'ADV'
            }
          ],
          onSelectContactFromSearch: vi.fn(),
          onClearSelectedContact: vi.fn(),
          setValue: vi.fn(),
          ...overrides
        } as unknown as CockpitFormLeftPaneProps}
        rightPaneProps={{} as CockpitFormRightPaneProps}
        entityProps={entityProps}
        onReset={vi.fn()}
      />
    </QueryClientProvider>
  );
};

describe('CockpitGuidedStepSwitch', () => {
  it('keeps Continue disabled until the contact step is complete', () => {
    render(
      <CockpitGuidedStepSwitch
        flow={buildFlow(false)}
        leftPaneProps={{} as CockpitFormLeftPaneProps}
        rightPaneProps={{} as CockpitFormRightPaneProps}
        entityProps={entityProps}
        onReset={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /continuer/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /continuer/i })).toHaveTextContent('Ctrl Entrée');
  });

  it('continues once a contact is selected', async () => {
    const user = userEvent.setup();
    const flow = buildFlow(true);

    render(
      <CockpitGuidedStepSwitch
        flow={flow}
        leftPaneProps={{} as CockpitFormLeftPaneProps}
        rightPaneProps={{} as CockpitFormRightPaneProps}
        entityProps={entityProps}
        onReset={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: /continuer/i }));

    expect(flow.completeStep).toHaveBeenCalledWith('contact');
  });

  it('valide l etape sujet au clavier quand le sujet est pret', async () => {
    const user = userEvent.setup();
    const flow = buildFlow(true, {
      activeStep: 'subject',
      subjectComplete: true
    });

    render(
      <CockpitGuidedStepSwitch
        flow={flow}
        leftPaneProps={{
          interactionType: 'Interne (CIR)',
          hasInteractionTypes: true,
          interactionTypes: ['Interne (CIR)'],
          interactionTypeRef: { current: null },
          setValue: vi.fn(),
          errors: {},
          contactFirstName: 'Arnaud',
          contactLastName: 'FERRON'
        } as unknown as CockpitFormLeftPaneProps}
        rightPaneProps={{
          subject: 'Demande interne',
          subjectField: buildField('subject'),
          notesField: buildField('notes'),
          orderRefField: buildField('order_ref'),
          reminderField: buildField('reminder_at'),
          errors: {},
          labelStyle: '',
          footerLabelStyle: '',
          statusMeta: null,
          statusCategoryLabel: 'En cours',
          statusCategoryBadges: {},
          statusTriggerRef: { current: null },
          statusValue: 'status-1',
          onStatusChange: vi.fn(),
          statusGroups: {
            todo: [],
            in_progress: [],
            done: []
          },
          hasStatuses: true,
          statusHelpId: 'status-help',
          reminderAt: '',
          onSetReminder: vi.fn(),
          onReset: vi.fn()
        } as unknown as CockpitFormRightPaneProps}
        entityProps={entityProps}
        onReset={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /continuer/i })).toHaveTextContent('Ctrl Entrée');

    await user.keyboard('{Control>}{Enter}{/Control}');

    expect(flow.completeStep).toHaveBeenCalledWith('subject');
  });

  it('limite l etape sujet sollicitation a la description et genere le sujet technique', async () => {
    const user = userEvent.setup();
    const setValue = vi.fn();
    const flow = buildFlow(true, {
      activeStep: 'subject',
      subjectComplete: false
    });

    render(
      <CockpitGuidedStepSwitch
        flow={flow}
        leftPaneProps={{
          relationMode: 'solicitation',
          interactionType: 'Démarchage téléphonique',
          hasInteractionTypes: true,
          interactionTypes: ['Démarchage téléphonique'],
          setValue,
          errors: {}
        } as unknown as CockpitFormLeftPaneProps}
        rightPaneProps={{
          subject: '',
          notes: 'Pub vérins atelier',
          subjectField: buildField('subject'),
          notesField: buildField('notes'),
          orderRefField: buildField('order_ref'),
          reminderField: buildField('reminder_at'),
          errors: {},
          labelStyle: '',
          footerLabelStyle: ''
        } as unknown as CockpitFormRightPaneProps}
        entityProps={entityProps}
        onReset={vi.fn()}
      />
    );

    expect(screen.getByRole('textbox', { name: /description/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/titre/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/type d'interaction/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/n° dossier/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /continuer/i }));

    expect(setValue).toHaveBeenCalledWith('subject', 'Pub vérins atelier', expect.any(Object));
    expect(flow.completeStep).toHaveBeenCalledWith('subject');
  });

  it('limite l etape sujet interne a la description et genere le sujet technique', async () => {
    const user = userEvent.setup();
    const setValue = vi.fn();
    const flow = buildFlow(true, {
      activeStep: 'subject',
      subjectComplete: false
    });

    render(
      <CockpitGuidedStepSwitch
        flow={flow}
        leftPaneProps={{
          relationMode: 'internal',
          interactionType: 'Interne (CIR)',
          hasInteractionTypes: true,
          interactionTypes: ['Interne (CIR)'],
          setValue,
          errors: {}
        } as unknown as CockpitFormLeftPaneProps}
        rightPaneProps={{
          subject: '',
          notes: 'Point rapide avec l’agence.',
          subjectField: buildField('subject'),
          notesField: buildField('notes'),
          orderRefField: buildField('order_ref'),
          reminderField: buildField('reminder_at'),
          errors: {},
          labelStyle: '',
          footerLabelStyle: ''
        } as unknown as CockpitFormRightPaneProps}
        entityProps={entityProps}
        onReset={vi.fn()}
      />
    );

    expect(screen.getByRole('textbox', { name: /description/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /relation interne cir/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/titre/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/type d'interaction/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/n° dossier/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /continuer/i }));

    expect(setValue).toHaveBeenCalledWith('subject', 'Point rapide avec l’agence.', expect.any(Object));
    expect(flow.completeStep).toHaveBeenCalledWith('subject');
  });

  it('limite l etape sujet fournisseur a la description et genere le sujet technique', async () => {
    const user = userEvent.setup();
    const setValue = vi.fn();
    const flow = buildFlow(true, {
      activeStep: 'subject',
      subjectComplete: false
    });

    render(
      <CockpitGuidedStepSwitch
        flow={flow}
        leftPaneProps={{
          relationMode: 'supplier',
          interactionType: 'Interaction fournisseur',
          hasInteractionTypes: true,
          interactionTypes: ['Interaction fournisseur'],
          setValue,
          errors: {}
        } as unknown as CockpitFormLeftPaneProps}
        rightPaneProps={{
          subject: '',
          notes: 'Relance délai vérins fournisseur.',
          subjectField: buildField('subject'),
          notesField: buildField('notes'),
          orderRefField: buildField('order_ref'),
          reminderField: buildField('reminder_at'),
          errors: {},
          labelStyle: '',
          footerLabelStyle: ''
        } as unknown as CockpitFormRightPaneProps}
        entityProps={entityProps}
        onReset={vi.fn()}
      />
    );

    expect(screen.getByRole('heading', { name: /interaction fournisseur/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /description/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/titre/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/statut/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/n° dossier/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /continuer/i }));

    expect(setValue).toHaveBeenCalledWith('subject', 'Relance délai vérins fournisseur.', expect.any(Object));
    expect(flow.completeStep).toHaveBeenCalledWith('subject');
  });

  it('valide l etape contact au clavier quand le contact est pret', async () => {
    const user = userEvent.setup();
    const flow = buildFlow(true);
    renderInternalContactStep(vi.fn(), flow);

    await user.keyboard('{Control>}{Enter}{/Control}');

    expect(flow.completeStep).toHaveBeenCalledWith('contact');
  });

  it('affiche une recherche interne compacte avec filtre agence et creation rapide repliee', () => {
    renderInternalContactStep();

    expect(screen.getByPlaceholderText(/nom, téléphone ou email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /filtrer par agence/i })).toHaveTextContent('Toutes les agences');
    expect(screen.getByText('Arnaud FERRON')).toBeInTheDocument();
    expect(screen.getByText('Claire Durand')).toBeInTheDocument();
    expect(screen.getByText('Ajouter un contact ponctuel')).toBeInTheDocument();
    expect(screen.getByText('Pour cette interaction uniquement.')).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /^prénom$/i })).not.toBeInTheDocument();
  });

  it('filtre les membres internes sur une ou plusieurs agences', async () => {
    const user = userEvent.setup();
    renderInternalContactStep();

    await user.click(screen.getByRole('button', { name: /filtrer par agence/i }));
    await user.click(screen.getByRole('menuitemcheckbox', { name: /cir toulouse/i }));

    expect(screen.getByRole('menuitemcheckbox', { name: /cir toulouse/i })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('Arnaud FERRON')).toBeInTheDocument();
    expect(screen.queryByText('Claire Durand')).not.toBeInTheDocument();

    await user.click(screen.getByRole('menuitemcheckbox', { name: /cir bordeaux/i }));

    expect(screen.getByRole('menuitemcheckbox', { name: /cir bordeaux/i })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('Arnaud FERRON')).toBeInTheDocument();
    expect(screen.getByText('Claire Durand')).toBeInTheDocument();

    await user.click(screen.getByRole('menuitemcheckbox', { name: /cir toulouse/i }));
    await user.click(screen.getByRole('menuitemcheckbox', { name: /cir bordeaux/i }));
    await user.keyboard('{Escape}');

    expect(screen.getByRole('button', { name: /filtrer par agence/i })).toHaveTextContent('Toutes les agences');
    expect(screen.getByText('Arnaud FERRON')).toBeInTheDocument();
    expect(screen.getByText('Claire Durand')).toBeInTheDocument();
  });

  it('affiche l etat vide et permet de creer un contact interne ponctuel', async () => {
    const user = userEvent.setup();
    const setValue = vi.fn();
    const flow = buildFlow(false);
    renderInternalContactStep(setValue, flow);

    await user.type(screen.getByPlaceholderText(/nom, téléphone ou email/i), 'aucun-resultat');

    expect(screen.getByText(/aucun membre trouvé/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^ajouter$/i }));
    await user.type(screen.getByRole('textbox', { name: /^prénom$/i }), 'jeanne');
    await user.type(screen.getByRole('textbox', { name: /^nom$/i }), 'martin');
    await user.type(screen.getByRole('textbox', { name: /^téléphone$/i }), '0558369619');

    expect(screen.getByRole('textbox', { name: /^prénom$/i })).toHaveValue('Jeanne');
    expect(screen.getByRole('textbox', { name: /^nom$/i })).toHaveValue('MARTIN');
    expect(screen.getByRole('textbox', { name: /^téléphone$/i })).toHaveValue('05 58 36 96 19');
    expect(screen.getByRole('textbox', { name: /email cir généré/i })).toHaveValue('j.martin@cir.fr');
    expect(screen.getByRole('combobox', { name: /agence du contact/i })).toHaveTextContent('CIR Toulouse');
    await user.click(screen.getByRole('button', { name: /utiliser ce contact/i }));

    expect(setValue).toHaveBeenCalledWith('company_name', 'CIR', expect.any(Object));
    expect(setValue).toHaveBeenCalledWith('company_city', 'CIR Toulouse', expect.any(Object));
    expect(setValue).toHaveBeenCalledWith('contact_first_name', 'Jeanne', expect.any(Object));
    expect(setValue).toHaveBeenCalledWith('contact_last_name', 'MARTIN', expect.any(Object));
    expect(setValue).toHaveBeenCalledWith('contact_phone', '05 58 36 96 19', expect.any(Object));
    expect(setValue).toHaveBeenCalledWith('contact_email', 'j.martin@cir.fr', expect.any(Object));
    expect(flow.completeStep).toHaveBeenCalledWith('contact');
  });

  it('selectionne directement un membre interne existant', async () => {
    const user = userEvent.setup();
    const setValue = vi.fn();
    const flow = buildFlow(false);
    renderInternalContactStep(setValue, flow);

    await user.click(screen.getByRole('button', { name: /arnaud ferron/i }));

    expect(setValue).toHaveBeenCalledWith('company_name', 'CIR', expect.any(Object));
    expect(setValue).toHaveBeenCalledWith('company_city', 'CIR Toulouse', expect.any(Object));
    expect(setValue).toHaveBeenCalledWith('contact_name', 'Arnaud FERRON', expect.any(Object));
    expect(setValue).toHaveBeenCalledWith('contact_email', 'a.ferron@cir.fr', expect.any(Object));
    expect(flow.completeStep).toHaveBeenCalledWith('contact');
  });

  it('affiche la recherche contact fournisseur et permet de continuer sans contact', async () => {
    const user = userEvent.setup();
    const flow = buildFlow(true);
    renderSupplierContactStep(flow);

    expect(screen.getByRole('heading', { name: /contact fournisseur/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /chercher un contact fournisseur/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /claire durand/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continuer sans contact/i })).toBeInTheDocument();

    await user.type(screen.getByRole('textbox', { name: /chercher un contact fournisseur/i }), '06 11');

    expect(screen.getByRole('button', { name: /claire durand/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /continuer sans contact/i }));

    expect(flow.completeStep).toHaveBeenCalledWith('contact');
  });

  it('cree rapidement un contact fournisseur puis le selectionne', async () => {
    const user = userEvent.setup();
    const onSelectContactFromSearch = vi.fn();
    vi.mocked(saveEntityContact).mockReturnValue(okAsync({
      id: 'contact-2',
      entity_id: 'supplier-1',
      first_name: 'Marc',
      last_name: 'Martin',
      phone: '06 22 33 44 55',
      email: 'marc@example.com',
      position: 'Commercial',
      notes: null,
      archived_at: null,
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z'
    } satisfies EntityContact));

    renderSupplierContactStep(buildFlow(true), { onSelectContactFromSearch });

    await user.type(screen.getByRole('textbox', { name: /prénom du contact fournisseur/i }), 'Marc');
    await user.type(screen.getByRole('textbox', { name: /^nom du contact fournisseur/i }), 'Martin');
    await user.type(screen.getByRole('textbox', { name: /téléphone du contact fournisseur/i }), '0622334455');
    await user.type(screen.getByRole('textbox', { name: /email du contact fournisseur/i }), 'marc@example.com');
    await user.type(screen.getByRole('textbox', { name: /fonction du contact fournisseur/i }), 'Commercial');
    await user.click(screen.getByRole('button', { name: /^ajouter$/i }));

    expect(saveEntityContact).toHaveBeenCalledWith({
      entity_id: 'supplier-1',
      first_name: 'Marc',
      last_name: 'Martin',
      phone: '06 22 33 44 55',
      email: 'marc@example.com',
      position: 'Commercial'
    });
    expect(onSelectContactFromSearch).toHaveBeenCalledWith(expect.objectContaining({
      id: 'contact-2',
      first_name: 'Marc'
    }), expect.objectContaining({ id: 'supplier-1' }));
  });
});

describe('CockpitGuidedAnswerRow', () => {
  it('garde les lignes confirmees editables en mode compact', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();

    render(
      <CockpitGuidedAnswerRow
        index={1}
        label="Canal"
        value="Téléphone"
        active={false}
        complete
        onEdit={onEdit}
      />
    );

    await user.click(screen.getByRole('button', { name: /téléphone/i }));

    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('bloque l edition d une ligne non editable comme Tiers CIR', () => {
    const onEdit = vi.fn();

    render(
      <CockpitGuidedAnswerRow
        index={3}
        label="Tiers"
        value="CIR"
        active={false}
        complete
        editable={false}
        onEdit={onEdit}
      />
    );

    expect(screen.getByRole('button', { name: /cir/i })).toBeDisabled();
    expect(onEdit).not.toHaveBeenCalled();
  });
});
