import type { ClientsPanelViewMode } from './ClientsPanel.shared';

type ClientsPanelTitleProps = {
  viewMode: ClientsPanelViewMode;
};

const ClientsPanelTitle = ({ viewMode }: ClientsPanelTitleProps) => (
  <div>
    <h2 className="text-sm font-semibold text-foreground">
      {viewMode === 'clients' ? 'Clients' : 'Prospects'}
    </h2>
    <p className="text-xs text-muted-foreground">
      {viewMode === 'clients' ? 'Gestion du portefeuille clients' : 'Suivi des prospects'}
    </p>
  </div>
);

export default ClientsPanelTitle;
