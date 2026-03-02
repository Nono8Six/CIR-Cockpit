import { useClientsPanelState } from '@/hooks/useClientsPanelState';
import ClientsPanelLayout from './clients/ClientsPanelLayout';
import type { ClientsPanelProps } from './clients/ClientsPanel.types';

const ClientsPanel = ({
  activeAgencyId,
  statuses,
  userRole,
  focusedClientId,
  focusedContactId,
  onFocusHandled,
  onRequestConvert
}: ClientsPanelProps) => {
  const state = useClientsPanelState({
    activeAgencyId,
    userRole,
    focusedClientId,
    onFocusHandled
  });

  return (
    <ClientsPanelLayout
      activeAgencyId={activeAgencyId}
      statuses={statuses}
      userRole={userRole}
      focusedContactId={focusedContactId}
      onRequestConvert={onRequestConvert}
      state={state}
    />
  );
};

export default ClientsPanel;
