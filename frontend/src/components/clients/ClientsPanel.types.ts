import type { UserRole } from '@/types';
import type { ConvertClientEntity } from '@/components/ConvertClientDialog';
import type { useClientsPanelState } from '@/hooks/useClientsPanelState';

export type ClientsPanelProps = {
  activeAgencyId: string | null;
  userRole: UserRole;
  focusedClientId: string | null;
  focusedContactId: string | null;
  onFocusHandled: () => void;
  onRequestConvert: (entity: ConvertClientEntity) => void;
};

export type ClientsPanelState = ReturnType<typeof useClientsPanelState>;

export type ClientsPanelLayoutProps = {
  activeAgencyId: string | null;
  userRole: UserRole;
  focusedContactId: string | null;
  onRequestConvert: (entity: ConvertClientEntity) => void;
  state: ClientsPanelState;
};
