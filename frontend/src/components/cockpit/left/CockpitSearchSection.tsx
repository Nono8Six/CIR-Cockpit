import { type RefObject } from 'react';
import { useNavigate } from '@tanstack/react-router';

import type { TierV1DirectoryRow } from '../../../../../shared/schemas/interaction/tier-v1.schema';
import type { RelationMode } from '@/constants/relations';
import type { Entity, EntityContact } from '@/types';
import InteractionSearchBar from '@/components/InteractionSearchBar';
import { DEFAULT_DIRECTORY_SEARCH } from '@/components/client-directory/clientDirectorySearch';

type CockpitSearchSectionProps = {
  activeAgencyId: string | null;
  entityType: string;
  entitySearchIndex: {
    entities: Entity[];
    contacts: EntityContact[];
  };
  entitySearchLoading: boolean;
  recentEntities: Entity[];
  relationMode: RelationMode;
  onSelectEntityFromSearch: (entity: Entity) => void;
  onSelectContactFromSearch: (contact: EntityContact, entity: Entity | null) => void;
  onSelectUnifiedSearchResult: (result: TierV1DirectoryRow) => void;
  onOpenClientDialog: (clientKind?: 'company' | 'individual', initialQuery?: string) => void;
  onOpenProspectDialog: (initialQuery?: string) => void;
  onOpenGlobalSearch?: () => void;
  searchInputRef: RefObject<HTMLInputElement | null>;
};

const getCreateLabel = (relationMode: RelationMode, entityType: string): string | undefined => {
  if (relationMode === 'client') {
    return entityType.trim().toLowerCase() === 'client comptant'
      ? 'Créer un client comptant'
      : 'Créer un client à terme';
  }
  if (relationMode === 'individual') return 'Créer un particulier';
  if (relationMode === 'prospect') return 'Créer un prospect';
  if (relationMode === 'supplier') return 'Créer un fournisseur';
  return undefined;
};

const CockpitSearchSection = ({
  activeAgencyId,
  entityType,
  entitySearchIndex,
  entitySearchLoading,
  recentEntities,
  relationMode,
  onSelectEntityFromSearch,
  onSelectContactFromSearch,
  onSelectUnifiedSearchResult,
  onOpenProspectDialog,
  onOpenGlobalSearch,
  searchInputRef
}: CockpitSearchSectionProps) => {
  const navigate = useNavigate();

  if (relationMode === 'internal' || relationMode === 'solicitation') {
    return null;
  }

  const handleCreateSupplier = () => {
    void navigate({ to: '/admin/suppliers/new' });
  };
  const handleCreateClient = () => {
    void navigate({ to: '/clients/new', search: () => DEFAULT_DIRECTORY_SEARCH });
  };
  const handleCreateEntity = relationMode === 'client'
    ? handleCreateClient
    : relationMode === 'prospect'
      ? (query?: string) => typeof query === 'string' ? onOpenProspectDialog(query) : onOpenProspectDialog()
      : relationMode === 'supplier'
        ? handleCreateSupplier
        : relationMode === 'individual'
          ? handleCreateClient
          : undefined;
  const createLabel = getCreateLabel(relationMode, entityType);
  const isSupplier = relationMode === 'supplier';

  return (
    <InteractionSearchBar
      agencyId={activeAgencyId}
      entityType={entityType}
      entities={entitySearchIndex.entities}
      contacts={entitySearchIndex.contacts}
      isLoading={entitySearchLoading}
      onSelectEntity={onSelectEntityFromSearch}
      onSelectContact={onSelectContactFromSearch}
      onSelectSearchResult={onSelectUnifiedSearchResult}
      onCreateEntity={handleCreateEntity}
      createLabel={createLabel}
      createMode={handleCreateEntity ? 'dialog' : 'none'}
      createDisabled={Boolean(createLabel && !handleCreateEntity && !isSupplier)}
      onOpenGlobalSearch={onOpenGlobalSearch}
      recentEntities={recentEntities}
      inputRef={searchInputRef}
      showTypeBadge={true}
    />
  );
};

export default CockpitSearchSection;
