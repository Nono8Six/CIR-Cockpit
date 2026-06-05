import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import SettingsSections from '@/components/settings/SettingsSections';
import type { AgencyStatus } from '@/types';
import type { ConfigUsageSnapshot } from '../../../../../shared/schemas/system/config.schema';

const statuses: AgencyStatus[] = [
  {
    id: 'status-1',
    label: 'À faire',
    category: 'todo',
    is_terminal: false,
    is_default: true,
    is_active: true,
    sort_order: 0,
  },
  {
    id: 'status-2',
    label: 'Terminé',
    category: 'done',
    is_terminal: true,
    is_default: false,
    is_active: true,
    sort_order: 1,
  },
];

const usage: ConfigUsageSnapshot = {
  agency_id: '11111111-1111-4111-8111-111111111111',
  dimensions: {
    statuses: [
      {
        label: 'À faire',
        reference_id: 'status-1',
        sort_order: 1,
        category: 'todo',
        is_active: true,
        usage_count: 2,
        state: 'active_used'
      }
    ],
    services: [
      {
        label: 'Fournisseur',
        reference_id: null,
        sort_order: null,
        category: null,
        is_active: true,
        usage_count: 1,
        state: 'unresolved'
      }
    ],
    families: [],
    interaction_types: []
  },
  totals: {
    unresolved: 1,
    archived: 0,
    resolved: 0,
    system_managed: 0,
    referenced_values: 1,
    used_values: 2
  }
};

const baseProps = {
  readOnly: false,
  activeSection: 'workflow',
  canEditAgencySettings: true,
  usage: null as ConfigUsageSnapshot | null,
  usageLoading: false,
  canRunImmediateAction: vi.fn(() => true),
  families: ['MOTORISATION'],
  services: ['Maintenance'],
  interactionTypes: ['SAV'],
  statuses,
  newFamily: '',
  newService: '',
  newInteractionType: '',
  newStatus: '',
  newStatusCategory: 'todo' as const,
  setNewFamily: vi.fn(),
  setNewService: vi.fn(),
  setNewInteractionType: vi.fn(),
  setNewStatus: vi.fn(),
  setNewStatusCategory: vi.fn(),
  addItem: vi.fn(),
  removeItem: vi.fn(),
  updateItem: vi.fn(),
  renameItem: vi.fn(),
  setFamilies: vi.fn(),
  setServices: vi.fn(),
  setInteractionTypes: vi.fn(),
  setStatuses: vi.fn(),
  addStatus: vi.fn(),
  removeStatus: vi.fn(),
  updateStatusLabel: vi.fn(),
  updateStatusCategory: vi.fn(),
  renameStatus: vi.fn(),
};

describe('SettingsSections', () => {
  it('renders settings as internal subpages instead of stacking every section', () => {
    render(<SettingsSections {...baseProps} activeSection="workflow" />);

    expect(screen.getByRole('heading', { name: 'Statuts des interactions' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Paramètres onboarding agence' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Paramètres globaux produit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Listes de saisie des interactions' })).not.toBeInTheDocument();
  });

  it('passes read-only agency permissions to editable subpages', () => {
    render(
      <SettingsSections
        {...baseProps}
        activeSection="lists"
        canEditAgencySettings={false}
      />
    );

    expect(screen.getByText('Lecture seule')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /ajouter un service/i })).not.toBeInTheDocument();
  });

  it('shows usage impact without editable tier types', () => {
    render(<SettingsSections {...baseProps} activeSection="lists" usage={usage} />);

    expect(screen.getByText(/1 anomalie/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Examiner' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Types de tiers' })).not.toBeInTheDocument();
  });

  it('keeps archive available when usage impact is unavailable', () => {
    render(<SettingsSections {...baseProps} activeSection="lists" usage={null} />);

    expect(screen.queryByText(/Suppression indisponible actuellement/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /corriger le libellé maintenance/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /supprimer maintenance/i })).toBeInTheDocument();
  });

  it('keeps status archive available when usage impact is unavailable', () => {
    render(<SettingsSections {...baseProps} activeSection="workflow" usage={null} />);

    expect(screen.getByRole('button', { name: /supprimer le statut à faire/i })).toBeInTheDocument();
  });

  it('shows archive for active values when usage impact is known', () => {
    render(<SettingsSections {...baseProps} activeSection="lists" usage={usage} />);

    expect(screen.getByRole('button', { name: /corriger le libellé maintenance/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /supprimer maintenance/i })).toBeInTheDocument();
  });

  it('shows used statuses as removable from the active workflow', () => {
    render(<SettingsSections {...baseProps} activeSection="workflow" usage={usage} />);

    expect(screen.getByRole('button', { name: /archiver le statut à faire/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /monter le statut/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /descendre le statut/i })).not.toBeInTheDocument();
  });

  it('hides manual move buttons from referential lists', () => {
    render(<SettingsSections {...baseProps} activeSection="lists" usage={usage} />);

    expect(screen.queryByRole('button', { name: /monter maintenance/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /descendre maintenance/i })).not.toBeInTheDocument();
  });

  it('shows historical statuses as a non editable audit section', () => {
    const usageWithHistorical: ConfigUsageSnapshot = {
      ...usage,
      dimensions: {
        ...usage.dimensions,
        statuses: [
          ...usage.dimensions.statuses,
          {
            label: 'Archive',
            reference_id: 'status-history',
            sort_order: 3,
            category: 'done',
            is_active: false,
            usage_count: 7,
            state: 'archived_used'
          }
        ]
      }
    };

    render(<SettingsSections {...baseProps} activeSection="workflow" usage={usageWithHistorical} />);

    expect(screen.getByText('Statuts historiques')).toBeInTheDocument();
    expect(screen.getByText('Archive')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
  });
});
