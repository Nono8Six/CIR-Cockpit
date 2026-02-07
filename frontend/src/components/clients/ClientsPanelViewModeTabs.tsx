import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ClientsPanelViewMode } from './ClientsPanel.shared';
import { isClientsPanelViewMode } from '@/utils/typeGuards';

type ClientsPanelViewModeTabsProps = { viewMode: ClientsPanelViewMode; onViewModeChange: (mode: ClientsPanelViewMode) => void };

const ClientsPanelViewModeTabs = ({ viewMode, onViewModeChange }: ClientsPanelViewModeTabsProps) => (
  <Tabs value={viewMode} onValueChange={(value) => { if (isClientsPanelViewMode(value)) onViewModeChange(value); }}>
    <TabsList className="bg-slate-100 rounded-md p-1 h-8">
      <TabsTrigger value="clients" className="text-xs px-3 data-[state=active]:bg-white data-[state=active]:text-cir-red">Clients</TabsTrigger>
      <TabsTrigger value="prospects" className="text-xs px-3 data-[state=active]:bg-white data-[state=active]:text-cir-red">Prospects</TabsTrigger>
    </TabsList>
  </Tabs>
);

export default ClientsPanelViewModeTabs;
