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
  userRole,
  focusedContactId,
  onRequestConvert,
  state
}: ClientsPanelLayoutProps) => {
  const toolbarProps = buildClientsPanelToolbarProps(state, userRole);
  const contentProps = buildClientsPanelContentProps({
    state,
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
    <div className="h-full flex flex-col gap-4">
      <ClientsPanelToolbar {...toolbarProps} />
      <ClientsPanelContent {...contentProps} />
      <ClientsPanelDialogs {...dialogsProps} />
    </div>
  );
};

export default ClientsPanelLayout;
