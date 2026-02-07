import type { AppTab } from '@/types';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { NavigationTab } from '@/components/AppHeader';
import { isAppTab } from '@/utils/typeGuards';

type AppHeaderTabsSectionProps = { activeTab: AppTab; navigationTabs: NavigationTab[]; onTabChange: (tab: AppTab) => void };

const AppHeaderTabsSection = ({ activeTab, navigationTabs, onTabChange }: AppHeaderTabsSectionProps) => (
  <Tabs value={activeTab} onValueChange={(value) => { if (isAppTab(value)) onTabChange(value); }}>
    <TabsList className="flex bg-slate-100 rounded-md p-1 gap-1 h-auto">
      {navigationTabs.map((tab) => (
        <TabsTrigger key={tab.value} value={tab.value} className="flex items-center gap-2 px-3 py-1 rounded-[4px] text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cir-red/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white text-slate-600 hover:text-cir-red hover:bg-cir-red/5 data-[state=active]:bg-white data-[state=active]:text-cir-red data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-cir-red/20">
          {tab.icon}
          {tab.label}
          {tab.badge}
        </TabsTrigger>
      ))}
    </TabsList>
  </Tabs>
);

export default AppHeaderTabsSection;
