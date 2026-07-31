import type { LucideIcon } from 'lucide-react';
import { Building2, Factory, PenLine } from 'lucide-react';

import type { AppShellNavSection } from '@/app/appConstants';
import type { AppTab } from '@/types';

export type AppCommandGroup = 'navigation' | 'creation';

export type AppCommand = {
  id: string;
  group: AppCommandGroup;
  label: string;
  hint: string;
  icon: LucideIcon;
  shortcut?: string;
  keywords: string;
  run: () => void;
};

export const APP_COMMAND_GROUP_LABELS: Record<AppCommandGroup, string> = {
  navigation: 'Aller à',
  creation: 'Créer'
};

type BuildAppCommandsParams = {
  sections: AppShellNavSection[];
  canAccessAdmin: boolean;
  onNavigateTab: (tab: AppTab) => void;
  onCreateEntity: () => void;
  onCreateSupplier: () => void;
};

const DIACRITICS_PATTERN = /\p{Diacritic}/gu;

const normalizeCommandText = (value: string): string =>
  value.normalize('NFD').replace(DIACRITICS_PATTERN, '').toLowerCase();

/**
 * Registre des commandes de la palette. La navigation est derivee de la
 * navigation du shell pour qu'aucune section ne puisse manquer, et les actions
 * de creation pointent uniquement vers des parcours qui existent deja.
 */
export const buildAppCommands = ({
  sections,
  canAccessAdmin,
  onNavigateTab,
  onCreateEntity,
  onCreateSupplier
}: BuildAppCommandsParams): AppCommand[] => {
  const navigationCommands = sections.flatMap((section) =>
    section.items.map((item) => ({
      id: `navigation-${item.id}`,
      group: 'navigation' as const,
      label: item.label,
      hint: section.title,
      icon: item.icon,
      shortcut: item.shortcut,
      keywords: `${section.title} ${item.label} ouvrir aller naviguer section`,
      run: () => onNavigateTab(item.id)
    }))
  );

  const creationCommands: AppCommand[] = [
    {
      id: 'creation-interaction',
      group: 'creation',
      label: 'Nouvelle interaction',
      hint: 'Saisie guidée',
      icon: PenLine,
      keywords: 'nouvelle interaction saisie appel echange creer',
      run: () => onNavigateTab('cockpit')
    },
    {
      id: 'creation-entity',
      group: 'creation',
      label: 'Créer un client ou un prospect',
      hint: 'Annuaire des tiers',
      icon: Building2,
      keywords: 'creer nouveau client prospect tiers fiche entreprise',
      run: onCreateEntity
    }
  ];

  if (canAccessAdmin) {
    creationCommands.push({
      id: 'creation-supplier',
      group: 'creation',
      label: 'Créer un fournisseur',
      hint: 'Fournisseurs',
      icon: Factory,
      keywords: 'creer nouveau fournisseur',
      run: onCreateSupplier
    });
  }

  return [...navigationCommands, ...creationCommands];
};

export const filterAppCommands = (commands: AppCommand[], query: string): AppCommand[] => {
  const normalizedQuery = normalizeCommandText(query.trim());

  if (normalizedQuery.length === 0) {
    return commands;
  }

  const terms = normalizedQuery.split(/\s+/);

  return commands.filter((command) => {
    const haystack = normalizeCommandText(
      `${command.label} ${command.hint} ${command.keywords} ${command.shortcut ?? ''}`
    );
    return terms.every((term) => haystack.includes(term));
  });
};
