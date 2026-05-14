import type { RefObject } from 'react';

import type { TierV1DirectoryRow } from 'shared/schemas/tier-v1.schema';
import type { RelationMode } from '@/constants/relations';
import type { Entity, EntityContact } from '@/types';
import InteractionSearchBar from '@/components/InteractionSearchBar';

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
  onOpenClientDialog: () => void;
  onOpenProspectDialog: () => void;
  onOpenGlobalSearch?: () => void;
  searchInputRef: RefObject<HTMLInputElement | null>;
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
  onOpenClientDialog,
  onOpenProspectDialog,
  onOpenGlobalSearch,
  searchInputRef
}: CockpitSearchSectionProps) => {
  if (relationMode === 'internal' || relationMode === 'solicitation') {
    return null;
  }

  const handleCreateEntity = relationMode === 'client'
    ? onOpenClientDialog
    : relationMode === 'prospect'
      ? onOpenProspectDialog
      : undefined;

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
      onOpenGlobalSearch={onOpenGlobalSearch}
      recentEntities={recentEntities}
      inputRef={searchInputRef}
      showTypeBadge={true}
    />
  );
};

export default CockpitSearchSection;
