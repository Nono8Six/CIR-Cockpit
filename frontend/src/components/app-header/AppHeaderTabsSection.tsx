import { useEffect, useRef } from 'react';

import type { AppTab } from '@/types';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { NavigationTab } from '@/components/AppHeader';
import { isAppTab } from '@/utils/typeGuards';

type AppHeaderTabsSectionProps = { activeTab: AppTab; navigationTabs: NavigationTab[]; onTabChange: (tab: AppTab) => void };

const AppHeaderTabsSection = ({ activeTab, navigationTabs, onTabChange }: AppHeaderTabsSectionProps) => {
  const tabRefs = useRef<Partial<Record<AppTab, HTMLButtonElement | null>>>({});

  useEffect(() => {
    tabRefs.current[activeTab]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }, [activeTab]);

  return (
    <Tabs value={activeTab} onValueChange={(value) => { if (isAppTab(value)) onTabChange(value); }}>
      <div className="relative min-w-0">
        <div
          data-testid="app-header-tabs-scroll"
          className="min-w-0 overflow-x-auto [scrollbar-width:thin]"
        >
          <TabsList className="inline-flex min-w-max items-center gap-1 rounded-md bg-muted p-1 h-auto">
            {navigationTabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                ref={(node) => { tabRefs.current[tab.value] = node; }}
                value={tab.value}
                aria-label={tab.ariaLabel}
                className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background text-muted-foreground hover:text-primary hover:bg-primary/10 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-ring/20"
              >
                {tab.icon}
                {tab.label}
                {tab.badge}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </div>
    </Tabs>
  );
};

export default AppHeaderTabsSection;
