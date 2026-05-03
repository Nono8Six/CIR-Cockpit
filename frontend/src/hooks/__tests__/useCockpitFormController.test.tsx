import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Channel, type Entity, type Interaction } from '@/types';
import { useCockpitFormController } from '@/hooks/useCockpitFormController';

const controllerMocks = vi.hoisted(() => ({
  useCockpitDialogsState: vi.fn(),
  useCockpitFormRefs: vi.fn(),
  useInteractionFormState: vi.fn(),
  useInteractionFormEffects: vi.fn(),
  useKnownCompanies: vi.fn(),
  useInteractionHandlers: vi.fn(),
  useCockpitDerivedState: vi.fn(),
  useInteractionDraft: vi.fn(),
  useInteractionGateState: vi.fn(),
  useInteractionStepper: vi.fn(),
  useInteractionFocus: vi.fn(),
  useInteractionSubmit: vi.fn(),
  useInteractionInvalidHandler: vi.fn(),
  useInteractionHotkeys: vi.fn(),
  useCockpitRegisterFields: vi.fn(),
  useCockpitPaneProps: vi.fn(),
  useSaveClient: vi.fn(),
  useSaveProspect: vi.fn(),
  useSaveEntityContact: vi.fn(),
  useEntityInteractions: vi.fn()
}));

vi.mock('@/hooks/useCockpitDialogsState', () => ({
  useCockpitDialogsState: controllerMocks.useCockpitDialogsState
}));
vi.mock('@/hooks/useCockpitFormRefs', () => ({
  useCockpitFormRefs: controllerMocks.useCockpitFormRefs
}));
vi.mock('@/hooks/useInteractionFormState', () => ({
  useInteractionFormState: controllerMocks.useInteractionFormState
}));
vi.mock('@/hooks/useInteractionFormEffects', () => ({
  useInteractionFormEffects: controllerMocks.useInteractionFormEffects
}));
vi.mock('@/hooks/useKnownCompanies', () => ({
  useKnownCompanies: controllerMocks.useKnownCompanies
}));
vi.mock('@/hooks/useInteractionHandlers', () => ({
  useInteractionHandlers: controllerMocks.useInteractionHandlers
}));
vi.mock('@/hooks/useCockpitDerivedState', () => ({
  useCockpitDerivedState: controllerMocks.useCockpitDerivedState
}));
vi.mock('@/hooks/useInteractionDraft', () => ({
  useInteractionDraft: controllerMocks.useInteractionDraft
}));
vi.mock('@/hooks/useInteractionGateState', () => ({
  useInteractionGateState: controllerMocks.useInteractionGateState
}));
vi.mock('@/hooks/useInteractionStepper', () => ({
  useInteractionStepper: controllerMocks.useInteractionStepper
}));
vi.mock('@/hooks/useInteractionFocus', () => ({
  useInteractionFocus: controllerMocks.useInteractionFocus
}));
vi.mock('@/hooks/useInteractionSubmit', () => ({
  useInteractionSubmit: controllerMocks.useInteractionSubmit
}));
vi.mock('@/hooks/useInteractionInvalidHandler', () => ({
  useInteractionInvalidHandler: controllerMocks.useInteractionInvalidHandler
}));
vi.mock('@/hooks/useInteractionHotkeys', () => ({
  useInteractionHotkeys: controllerMocks.useInteractionHotkeys
}));
vi.mock('@/hooks/useCockpitRegisterFields', () => ({
  useCockpitRegisterFields: controllerMocks.useCockpitRegisterFields
}));
vi.mock('@/hooks/useCockpitPaneProps', () => ({
  useCockpitPaneProps: controllerMocks.useCockpitPaneProps
}));
vi.mock('@/hooks/useSaveClient', () => ({
  useSaveClient: controllerMocks.useSaveClient
}));
vi.mock('@/hooks/useSaveProspect', () => ({
  useSaveProspect: controllerMocks.useSaveProspect
}));
vi.mock('@/hooks/useSaveEntityContact', () => ({
  useSaveEntityContact: controllerMocks.useSaveEntityContact
}));
vi.mock('@/hooks/useEntityInteractions', () => ({
  useEntityInteractions: controllerMocks.useEntityInteractions
}));

const buildWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });
  const Wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  Wrapper.displayName = 'UseCockpitFormControllerWrapper';
  return Wrapper;
};

const BASE_CONFIG = {
  statuses: [
    {
      id: 'status-1',
      label: 'Nouveau',
      category: 'todo' as const,
      is_terminal: false,
      is_default: true,
      sort_order: 1
    }
  ],
  services: ['Atelier'],
  entities: ['Client'],
  families: ['Freinage'],
  interactionTypes: ['Devis']
};

const buildInteraction = (overrides: Partial<Interaction> & { id: string }): Interaction => ({
  id: overrides.id,
  agency_id: overrides.agency_id ?? 'agency-1',
  channel: overrides.channel ?? Channel.PHONE,
  company_name: overrides.company_name ?? 'SEA Aquitaine',
  contact_email: overrides.contact_email ?? null,
  contact_id: overrides.contact_id ?? null,
  contact_name: overrides.contact_name ?? '',
  contact_phone: overrides.contact_phone ?? null,
  contact_service: overrides.contact_service ?? 'Atelier',
  created_at: overrides.created_at ?? '2026-04-20T10:00:00.000Z',
  created_by: overrides.created_by ?? 'user-1',
  entity_id: overrides.entity_id ?? 'entity-1',
  entity_type: overrides.entity_type ?? 'Client',
  interaction_type: overrides.interaction_type ?? 'Devis',
  last_action_at: overrides.last_action_at ?? '2026-04-20T10:00:00.000Z',
  mega_families: overrides.mega_families ?? [],
  notes: overrides.notes ?? null,
  order_ref: overrides.order_ref ?? null,
  reminder_at: overrides.reminder_at ?? null,
  status: overrides.status ?? 'Nouveau',
  status_id: overrides.status_id ?? 'status-1',
  status_is_terminal: overrides.status_is_terminal ?? false,
  subject: overrides.subject ?? 'Demande',
  timeline: overrides.timeline ?? [],
  updated_at: overrides.updated_at ?? '2026-04-20T10:00:00.000Z',
  updated_by: overrides.updated_by ?? null
});

const buildEntity = (overrides: Partial<Entity> & { id: string }): Entity => ({
  id: overrides.id,
  agency_id: overrides.agency_id ?? 'agency-1',
  account_type: overrides.account_type ?? null,
  address: overrides.address ?? null,
  archived_at: overrides.archived_at ?? null,
  cir_commercial_id: overrides.cir_commercial_id ?? null,
  city: overrides.city ?? 'Gradignan',
  client_kind: overrides.client_kind ?? null,
  client_number: overrides.client_number ?? '116277',
  country: overrides.country ?? 'France',
  created_at: overrides.created_at ?? '2026-04-20T10:00:00.000Z',
  created_by: overrides.created_by ?? null,
  department: overrides.department ?? '33',
  entity_type: overrides.entity_type ?? 'Client',
  naf_code: overrides.naf_code ?? null,
  name: overrides.name ?? 'SEA',
  notes: overrides.notes ?? null,
  official_data_source: overrides.official_data_source ?? null,
  official_data_synced_at: overrides.official_data_synced_at ?? null,
  official_name: overrides.official_name ?? null,
  postal_code: overrides.postal_code ?? '33170',
  siren: overrides.siren ?? null,
  siret: overrides.siret ?? null,
  updated_at: overrides.updated_at ?? '2026-04-20T10:00:00.000Z'
});

describe('useCockpitFormController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    controllerMocks.useCockpitDialogsState.mockReturnValue({
      selectedEntity: null,
      selectedContact: null,
      setSelectedEntity: vi.fn(),
      setSelectedContact: vi.fn(),
      setIsContactDialogOpen: vi.fn(),
      setIsClientDialogOpen: vi.fn(),
      setIsProspectDialogOpen: vi.fn(),
      setIsConvertDialogOpen: vi.fn(),
      setShowSuggestions: vi.fn(),
      setServicePickerOpen: vi.fn(),
      closeConvertDialog: vi.fn(),
      handleOpenConvertDialog: vi.fn(),
      handleConvertDialogChange: vi.fn(),
      isClientDialogOpen: false,
      isProspectDialogOpen: false,
      isContactDialogOpen: false,
      isConvertDialogOpen: false,
      convertTarget: null,
      showSuggestions: false,
      servicePickerOpen: false,
      agencies: []
    });
    controllerMocks.useCockpitFormRefs.mockReturnValue({
      formRef: { current: null },
      channelButtonRef: { current: null },
      relationButtonRef: { current: null },
      interactionTypeRef: { current: null },
      companyInputRef: { current: null },
      contactFirstNameInputRef: { current: null },
      contactSelectRef: { current: null },
      searchInputRef: { current: null },
      statusTriggerRef: { current: null }
    });
    controllerMocks.useInteractionFormState.mockReturnValue({
      relationOptions: ['Client'],
      defaultStatusId: 'status-1',
      entityType: 'Client',
      statusId: 'status-1',
      contactService: 'Atelier',
      interactionType: 'Devis',
      normalizedRelation: 'client',
      entityId: '',
      isInternalRelation: false,
      isSolicitationRelation: false,
      entities: [],
      contacts: [],
      contactsQuery: { isLoading: false },
      channel: Channel.PHONE,
      relationMode: 'client',
      companyName: '',
      companyCity: '',
      contactFirstName: '',
      contactLastName: '',
      contactPosition: '',
      contactName: '',
      contactPhone: '',
      contactEmail: '',
      subject: '',
      megaFamilies: [],
      orderRef: '',
      reminderAt: '',
      notes: '',
      isClientRelation: true,
      isProspectRelation: false,
      isSupplierRelation: false,
      contactSelectValue: '',
      selectedEntityMeta: null,
      selectedContactMeta: null,
      canConvertToClient: false,
      hasInteractionTypes: true,
      interactionTypeHelpId: 'interaction-help',
      quickServices: [],
      remainingServices: [],
      statusMeta: null,
      statusCategoryLabel: 'A traiter',
      statusGroups: [],
      hasStatuses: true,
      statusHelpId: 'status-help',
      agencies: []
    });
    controllerMocks.useKnownCompanies.mockReturnValue({
      knownCompanies: [],
      setKnownCompanies: vi.fn()
    });
    controllerMocks.useSaveClient.mockReturnValue({ mutateAsync: vi.fn() });
    controllerMocks.useSaveProspect.mockReturnValue({ mutateAsync: vi.fn() });
    controllerMocks.useSaveEntityContact.mockReturnValue({ mutateAsync: vi.fn() });
    controllerMocks.useEntityInteractions.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false
    });
    controllerMocks.useInteractionHandlers.mockReturnValue({
      handleSelectEntity: vi.fn(),
      handleSelectContact: vi.fn(),
      handleSelectEntityFromSearch: vi.fn(),
      handleSelectContactFromSearch: vi.fn(),
      handleSaveClient: vi.fn(),
      handleSaveProspect: vi.fn(),
      handleSaveContact: vi.fn(),
      handleConvertClient: vi.fn(),
      handleSelectRecent: vi.fn(),
      handleContactSelect: vi.fn(),
      handleContactFirstNameChange: vi.fn(),
      handleContactLastNameChange: vi.fn(),
      handlePhoneChange: vi.fn(),
      toggleFamily: vi.fn(),
      setReminder: vi.fn()
    });
    controllerMocks.useCockpitDerivedState.mockReturnValue({
      draftPayload: {
        values: {
          channel: Channel.PHONE,
          entity_type: 'Client',
          contact_service: 'Atelier',
          company_name: '',
          company_city: '',
          contact_first_name: '',
          contact_last_name: '',
          contact_position: '',
          contact_name: '',
          contact_phone: '',
          contact_email: '',
          subject: '',
          mega_families: [],
          status_id: 'status-1',
          interaction_type: 'Devis',
          order_ref: '',
          reminder_at: '',
          notes: '',
          entity_id: '',
          contact_id: ''
        }
      },
      hasDraftContent: false,
      companySuggestions: [],
      quickServices: [],
      remainingServices: []
    });
    controllerMocks.useInteractionDraft.mockReturnValue({
      handleReset: vi.fn()
    });
    controllerMocks.useInteractionGateState.mockReturnValue({
      canSave: true,
      gateMessage: null,
      hasContactMethod: true
    });
    controllerMocks.useInteractionStepper.mockReturnValue({
      stepperSteps: [{ id: 'step-1', title: 'Informations' }],
      currentStepIndex: 0
    });
    controllerMocks.useInteractionFocus.mockReturnValue(vi.fn());
    controllerMocks.useInteractionSubmit.mockReturnValue({
      onSubmit: vi.fn()
    });
    controllerMocks.useInteractionInvalidHandler.mockReturnValue(vi.fn());
    controllerMocks.useCockpitRegisterFields.mockReturnValue({
      companyField: {},
      companyCityField: {},
      contactFirstNameField: {},
      contactLastNameField: {},
      contactPositionField: {},
      contactPhoneField: {},
      contactEmailField: {},
      subjectField: {},
      notesField: {},
      orderRefField: {},
      reminderField: {}
    });
    controllerMocks.useCockpitPaneProps.mockReturnValue({
      leftPaneProps: { title: 'left' },
      rightPaneProps: { title: 'right' }
    });
  });

  it('returns form controller state when gate allows saving', () => {
    const onSave = vi.fn().mockResolvedValue(true);

    const { result } = renderHook(
      () =>
        useCockpitFormController({
          onSave,
          config: BASE_CONFIG,
          activeAgencyId: 'agency-1',
          userId: 'user-1',
          userRole: 'agency_admin',
          entitySearchIndex: { entities: [], contacts: [] },
          entitySearchLoading: false,
          recentEntities: []
        }),
      { wrapper: buildWrapper() }
    );

    expect(result.current.canSave).toBe(true);
    expect(result.current.gateMessage).toBeNull();
    expect(result.current.leftPaneProps).toEqual({ title: 'left' });
    expect(result.current.rightPaneProps).toEqual({ title: 'right' });
  });

  it('surfaces gate message when saving is blocked', () => {
    controllerMocks.useInteractionGateState.mockReturnValue({
      canSave: false,
      gateMessage: 'Informations manquantes.',
      hasContactMethod: false
    });

    const { result } = renderHook(
      () =>
        useCockpitFormController({
          onSave: vi.fn().mockResolvedValue(true),
          config: BASE_CONFIG,
          activeAgencyId: 'agency-1',
          userId: 'user-1',
          userRole: 'agency_admin',
          entitySearchIndex: { entities: [], contacts: [] },
          entitySearchLoading: false,
          recentEntities: []
        }),
      { wrapper: buildWrapper() }
    );

    expect(result.current.canSave).toBe(false);
    expect(result.current.gateMessage).toBe('Informations manquantes.');
  });

  it('falls back to empty recent entities when prop is omitted', () => {
    renderHook(
      () =>
        useCockpitFormController({
          onSave: vi.fn().mockResolvedValue(true),
          config: BASE_CONFIG,
          activeAgencyId: 'agency-1',
          userId: 'user-1',
          userRole: 'agency_admin',
          entitySearchIndex: { entities: [], contacts: [] },
          entitySearchLoading: false
        }),
      { wrapper: buildWrapper() }
    );

    expect(controllerMocks.useCockpitPaneProps).toHaveBeenCalled();
    const lastCallArgs = controllerMocks.useCockpitPaneProps.mock.calls.at(-1)?.[0];
    expect(lastCallArgs?.recentEntities).toEqual([]);
  });

  it('appelle toujours le hook interactions client sans selection active', () => {
    renderHook(
      () =>
        useCockpitFormController({
          onSave: vi.fn().mockResolvedValue(true),
          config: BASE_CONFIG,
          activeAgencyId: 'agency-1',
          userId: 'user-1',
          userRole: 'agency_admin',
          entitySearchIndex: { entities: [], contacts: [] },
          entitySearchLoading: false,
          recentEntities: [],
          interactions: []
        }),
      { wrapper: buildWrapper() }
    );

    expect(controllerMocks.useEntityInteractions).toHaveBeenCalledWith(null, 1, 6, false);
  });

  it('wires prospect creation into pane props and dialogs', () => {
    const setIsProspectDialogOpen = vi.fn();
    const handleSaveProspect = vi.fn();
    controllerMocks.useCockpitDialogsState.mockReturnValue({
      ...controllerMocks.useCockpitDialogsState(),
      isProspectDialogOpen: true,
      setIsProspectDialogOpen
    });
    controllerMocks.useInteractionHandlers.mockReturnValue({
      ...controllerMocks.useInteractionHandlers(),
      handleSaveProspect
    });

    const { result } = renderHook(
      () =>
        useCockpitFormController({
          onSave: vi.fn().mockResolvedValue(true),
          config: BASE_CONFIG,
          activeAgencyId: 'agency-1',
          userId: 'user-1',
          userRole: 'agency_admin',
          entitySearchIndex: { entities: [], contacts: [] },
          entitySearchLoading: false,
          recentEntities: []
        }),
      { wrapper: buildWrapper() }
    );

    const lastCallArgs = controllerMocks.useCockpitPaneProps.mock.calls.at(-1)?.[0];
    lastCallArgs?.onOpenProspectDialog();

    expect(setIsProspectDialogOpen).toHaveBeenCalledWith(true);
    expect(result.current.dialogs.isProspectDialogOpen).toBe(true);
    expect(result.current.dialogs.onSaveProspect).toBe(handleSaveProspect);
  });

  it('affiche les saisies recentes quand seuls les defaults sont presents', () => {
    const { result } = renderHook(
      () =>
        useCockpitFormController({
          onSave: vi.fn().mockResolvedValue(true),
          config: BASE_CONFIG,
          activeAgencyId: 'agency-1',
          userId: 'user-1',
          userRole: 'agency_admin',
          entitySearchIndex: { entities: [], contacts: [] },
          entitySearchLoading: false,
          recentEntities: [],
          interactions: [buildInteraction({ id: 'interaction-1' })]
        }),
      { wrapper: buildWrapper() }
    );

    expect(result.current.showEntryRecents).toBe(true);
  });

  it('masque les saisies recentes quand un vrai contenu de brouillon existe', () => {
    controllerMocks.useCockpitDerivedState.mockReturnValue({
      ...controllerMocks.useCockpitDerivedState(),
      hasDraftContent: true
    });

    const { result } = renderHook(
      () =>
        useCockpitFormController({
          onSave: vi.fn().mockResolvedValue(true),
          config: BASE_CONFIG,
          activeAgencyId: 'agency-1',
          userId: 'user-1',
          userRole: 'agency_admin',
          entitySearchIndex: { entities: [], contacts: [] },
          entitySearchLoading: false,
          recentEntities: [],
          interactions: [buildInteraction({ id: 'interaction-1' })]
        }),
      { wrapper: buildWrapper() }
    );

    expect(result.current.showEntryRecents).toBe(false);
  });

  it('charge le contexte interactions avec l identifiant du client selectionne', () => {
    const selectedEntity = buildEntity({ id: 'entity-client-1' });
    const ownInteraction = buildInteraction({
      id: 'own-user-other-client',
      created_by: 'user-1',
      entity_id: 'entity-other'
    });
    const clientInteraction = buildInteraction({
      id: 'client-context',
      created_by: 'user-2',
      entity_id: 'entity-client-1'
    });

    controllerMocks.useCockpitDialogsState.mockReturnValue({
      ...controllerMocks.useCockpitDialogsState(),
      selectedEntity
    });
    controllerMocks.useEntityInteractions.mockReturnValue({
      data: {
        interactions: [clientInteraction],
        page: 1,
        pageSize: 6,
        total: 1,
        totalPages: 1
      },
      isLoading: false,
      isError: false
    });

    const { result } = renderHook(
      () =>
        useCockpitFormController({
          onSave: vi.fn().mockResolvedValue(true),
          config: BASE_CONFIG,
          activeAgencyId: 'agency-1',
          userId: 'user-1',
          userRole: 'agency_admin',
          entitySearchIndex: { entities: [], contacts: [] },
          entitySearchLoading: false,
          recentEntities: [],
          interactions: [ownInteraction]
        }),
      { wrapper: buildWrapper() }
    );

    expect(controllerMocks.useEntityInteractions).toHaveBeenCalledWith('entity-client-1', 1, 6, true);
    expect(result.current.recentOwnInteractions.map((interaction) => interaction.id)).toEqual([
      'own-user-other-client'
    ]);
    expect(result.current.clientContextInteractions.map((interaction) => interaction.id)).toEqual([
      'client-context'
    ]);
  });
});

