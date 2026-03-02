import { memo } from 'react';
import ClientsPanelContent from './ClientsPanelContent';
import ClientsPanelDialogs from './ClientsPanelDialogs';
import ClientsPanelToolbar from './ClientsPanelToolbar';
import {
  buildClientsPanelContentProps,
  buildClientsPanelDialogsProps,
  buildClientsPanelToolbarProps
} from './buildClientsPanelSectionProps';
import type { ClientsPanelLayoutProps } from './ClientsPanel.types';

const ClientsPanelLayout = ({
  activeAgencyId,
  statuses,
  userRole,
  focusedContactId,
  onRequestConvert,
  state
}: ClientsPanelLayoutProps) => {
  const toolbarProps = buildClientsPanelToolbarProps(state, userRole);
  const contentProps = buildClientsPanelContentProps({
    state,
    activeAgencyId,
    statuses,
    focusedContactId,
    onRequestConvert,
    userRole
  });
  const dialogsProps = buildClientsPanelDialogsProps({
    state,
    activeAgencyId,
    userRole
  });

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <ClientsPanelToolbar {...toolbarProps} />
      <ClientsPanelContent {...contentProps} />
      <ClientsPanelDialogs {...dialogsProps} />
    </div>
  );
};

export default memo(ClientsPanelLayout);
