import type { Ref } from 'react';

import type { TierV1DirectoryRow } from 'shared/schemas/tier-v1.schema';
import type { Entity, EntityContact } from '@/types';

export type InteractionSearchBarProps = {
  agencyId?: string | null;
  entityType?: string;
  entities: Entity[];
  contacts: EntityContact[];
  isLoading?: boolean;
  onSelectEntity: (entity: Entity) => void;
  onSelectContact: (contact: EntityContact, entity: Entity | null) => void;
  onSelectSearchResult: (result: TierV1DirectoryRow) => void;
  onCreateEntity?: () => void;
  onOpenGlobalSearch?: () => void;
  recentEntities?: Entity[];
  inputRef?: Ref<HTMLInputElement>;
  showTypeBadge?: boolean;
};
