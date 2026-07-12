import { useState } from 'react';
import { Activity, Bot, Gauge, KeyRound, MessageSquareText, ShieldCheck, Users } from 'lucide-react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/navigation/Tabs';
import { AiAccessTab } from '@/components/admin-ai/AiAccessTab';
import { AiModelsTab } from '@/components/admin-ai/AiModelsTab';
import { AiOverviewTab } from '@/components/admin-ai/AiOverviewTab';
import { AiPromptsTab } from '@/components/admin-ai/AiPromptsTab';
import { AiQuotasTab } from '@/components/admin-ai/AiQuotasTab';
import { AiUsageTab } from '@/components/admin-ai/AiUsageTab';

const tabs = [
  ['overview', 'Vue d’ensemble', Gauge], ['models', 'Fournisseur & modèles', KeyRound],
  ['access', 'Accès membres', Users], ['quotas', 'Quotas', ShieldCheck],
  ['prompts', 'Prompts', MessageSquareText], ['usage', 'Usage & audit', Activity]
] as const;

const AdminAiPanel = () => {
  const [activeTab, setActiveTab] = useState('overview');
  return (
    <section className="space-y-4 pb-6" data-testid="admin-ai-panel">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2"><Bot className="size-5 text-primary" aria-hidden="true" /><h2 className="text-lg font-semibold text-foreground">Gouvernance IA</h2></div>
          <p className="mt-1 max-w-[72ch] text-xs text-muted-foreground">Configurez les modèles, les accès, les limites et les prompts à partir des données réellement persistées.</p>
        </div>
      </header>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-surface-1 p-1">
          {tabs.map(([value, label, Icon]) => <TabsTrigger key={value} value={value} className="gap-1.5 px-3 py-2 text-xs"><Icon className="size-3.5" aria-hidden="true" />{label}</TabsTrigger>)}
        </TabsList>
        <TabsContent value="overview" className="mt-4"><AiOverviewTab onNavigate={setActiveTab} /></TabsContent>
        <TabsContent value="models" className="mt-4"><AiModelsTab /></TabsContent>
        <TabsContent value="access" className="mt-4"><AiAccessTab /></TabsContent>
        <TabsContent value="quotas" className="mt-4"><AiQuotasTab /></TabsContent>
        <TabsContent value="prompts" className="mt-4"><AiPromptsTab /></TabsContent>
        <TabsContent value="usage" className="mt-4"><AiUsageTab /></TabsContent>
      </Tabs>
    </section>
  );
};

export default AdminAiPanel;
