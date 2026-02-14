import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ClientsPanelViewMode } from './ClientsPanel.shared';
import { isClientsPanelViewMode } from '@/utils/typeGuards';

type ClientsPanelViewModeTabsProps = { viewMode: ClientsPanelViewMode; onViewModeChange: (mode: ClientsPanelViewMode) => void };

const ClientsPanelViewModeTabs = ({
  viewMode,
  onViewModeChange
}: ClientsPanelViewModeTabsProps) => (
  <Tabs
    value={viewMode}
    onValueChange={(value) => {
      if (isClientsPanelViewMode(value)) onViewModeChange(value);
    }}
  >
    <TabsList className="h-8 rounded-md bg-slate-100 p-1" data-testid="clients-toolbar-view-mode">
      <TabsTrigger
        value="clients"
        className="px-3 text-xs data-[state=active]:bg-white data-[state=active]:text-cir-red"
      >
        Clients
      </TabsTrigger>
      <TabsTrigger
        value="prospects"
        className="px-3 text-xs data-[state=active]:bg-white data-[state=active]:text-cir-red"
      >
        Prospects
      </TabsTrigger>
    </TabsList>
  </Tabs>
);

export default ClientsPanelViewModeTabs;
