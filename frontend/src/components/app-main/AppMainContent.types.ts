import type { AgencyConfig } from '@/services/config';
import type {
  AppTab,
  Entity,
  EntityContact,
  Interaction,
  InteractionDraft,
  UserRole
} from '@/types';
import type { ConvertClientEntity } from '@/components/ConvertClientDialog';

export type AppMainContentProps = {
  activeTab: AppTab;
  isInteractionTab: boolean;
  isContextBlocking: boolean;
  isDataLoading: boolean;
  hasDataError: boolean;
  activeAgencyId: string | null;
  contextError: string | null;
  config: AgencyConfig;
  interactions: Interaction[];
  userId: string | null;
  userRole: UserRole;
  recentEntities: Entity[];
  entitySearchIndex: {
    entities: Entity[];
    contacts: EntityContact[];
  };
  entitySearchLoading: boolean;
  canAccessSettings: boolean;
  canEditSettings: boolean;
  canAccessAdmin: boolean;
  focusedClientId: string | null;
  focusedContactId: string | null;
  onFocusHandled: () => void;
  onSaveInteraction: (draft: InteractionDraft) => Promise<boolean>;
  onRequestConvert: (entity: ConvertClientEntity) => void;
  onOpenGlobalSearch: () => void;
  onReloadData: () => void;
};
