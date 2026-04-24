import type { AgencyConfig } from '@/services/config';
import type {
  Entity,
  EntityContact,
  Interaction,
  InteractionDraft,
  UserRole
} from '@/types';

export type CockpitFormProps = {
  onSave: (interaction: InteractionDraft) => Promise<boolean>;
  config: AgencyConfig;
  activeAgencyId: string | null;
  userId: string | null;
  userRole: UserRole;
  recentEntities?: Entity[];
  interactions?: Interaction[];
  entitySearchIndex: {
    entities: Entity[];
    contacts: EntityContact[];
  };
  entitySearchLoading: boolean;
  onOpenGlobalSearch?: () => void;
};
