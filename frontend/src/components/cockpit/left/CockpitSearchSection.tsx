import type { RefObject } from 'react';

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
  isInternalRelation: boolean;
  isSolicitationRelation: boolean;
  isClientRelation: boolean;
  onSelectEntityFromSearch: (entity: Entity) => void;
  onSelectContactFromSearch: (contact: EntityContact, entity: Entity | null) => void;
  onOpenClientDialog: () => void;
  onOpenGlobalSearch?: () => void;
  searchInputRef: RefObject<HTMLInputElement | null>;
};

const CockpitSearchSection = ({
  activeAgencyId,
  entityType,
  entitySearchIndex,
  entitySearchLoading,
  recentEntities,
  isInternalRelation,
  isSolicitationRelation,
  isClientRelation,
  onSelectEntityFromSearch,
  onSelectContactFromSearch,
  onOpenClientDialog,
  onOpenGlobalSearch,
  searchInputRef
}: CockpitSearchSectionProps) => {
  if (isInternalRelation || isSolicitationRelation) {
    return null;
  }

  return (
    <InteractionSearchBar
      agencyId={activeAgencyId}
      entityType={entityType}
      entities={entitySearchIndex.entities}
      contacts={entitySearchIndex.contacts}
      isLoading={entitySearchLoading}
      onSelectEntity={onSelectEntityFromSearch}
      onSelectContact={onSelectContactFromSearch}
      onCreateEntity={isClientRelation ? onOpenClientDialog : undefined}
      onOpenGlobalSearch={onOpenGlobalSearch}
      recentEntities={recentEntities}
      inputRef={searchInputRef}
    />
  );
};

export default CockpitSearchSection;
