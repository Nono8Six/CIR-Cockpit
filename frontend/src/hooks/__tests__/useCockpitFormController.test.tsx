import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Channel } from '@/types';
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
  useSaveEntityContact: vi.fn()
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
vi.mock('@/hooks/useSaveEntityContact', () => ({
  useSaveEntityContact: controllerMocks.useSaveEntityContact
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
      setIsConvertDialogOpen: vi.fn(),
      setShowSuggestions: vi.fn(),
      setServicePickerOpen: vi.fn(),
      closeConvertDialog: vi.fn(),
      handleOpenConvertDialog: vi.fn(),
      handleConvertDialogChange: vi.fn(),
      isClientDialogOpen: false,
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
    controllerMocks.useSaveEntityContact.mockReturnValue({ mutateAsync: vi.fn() });
    controllerMocks.useInteractionHandlers.mockReturnValue({
      handleSelectEntity: vi.fn(),
      handleSelectContact: vi.fn(),
      handleSelectEntityFromSearch: vi.fn(),
      handleSelectContactFromSearch: vi.fn(),
      handleSaveClient: vi.fn(),
      handleSaveContact: vi.fn(),
      handleConvertClient: vi.fn(),
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
});

