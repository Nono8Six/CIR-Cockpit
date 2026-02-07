import type { Ref } from 'react';

import type { Entity, EntityContact } from '@/types';

export type InteractionSearchBarProps = {
  agencyId?: string | null;
  entityType?: string;
  entities: Entity[];
  contacts: EntityContact[];
  isLoading?: boolean;
  onSelectEntity: (entity: Entity) => void;
  onSelectContact: (contact: EntityContact, entity: Entity | null) => void;
  onCreateEntity?: () => void;
  onOpenGlobalSearch?: () => void;
  recentEntities?: Entity[];
  inputRef?: Ref<HTMLInputElement>;
};
