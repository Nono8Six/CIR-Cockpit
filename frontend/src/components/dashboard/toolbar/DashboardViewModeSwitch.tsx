import { Columns3, LayoutList } from 'lucide-react';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

type ViewMode = 'kanban' | 'list';

type DashboardViewModeSwitchProps = {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
};

const isViewMode = (value: string): value is ViewMode => value === 'kanban' || value === 'list';

const DashboardViewModeSwitch = ({
  viewMode,
  onViewModeChange
}: DashboardViewModeSwitchProps) => (
  <Tabs
    value={viewMode}
    onValueChange={(value) => {
      if (isViewMode(value)) {
        onViewModeChange(value);
      }
    }}
  >
    <TabsList
      className="h-9 w-full rounded-md border border-border bg-surface-1 p-1 sm:w-auto"
      data-testid="dashboard-view-mode-tabs"
    >
      <TabsTrigger
        value="kanban"
        className="h-7 flex-1 gap-1.5 px-3 text-sm data-[state=active]:bg-card data-[state=active]:text-primary sm:flex-none"
      >
        <Columns3 size={14} aria-hidden="true" />
        Tableau
      </TabsTrigger>
      <TabsTrigger
        value="list"
        className="h-7 flex-1 gap-1.5 px-3 text-sm data-[state=active]:bg-card data-[state=active]:text-primary sm:flex-none"
      >
        <LayoutList size={14} aria-hidden="true" />
        Historique
      </TabsTrigger>
    </TabsList>
  </Tabs>
);

export default DashboardViewModeSwitch;
