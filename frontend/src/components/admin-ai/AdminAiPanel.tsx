import { useState } from 'react';
import { Activity, Bot, FileText, KeyRound, MessageSquareText, ShieldCheck } from 'lucide-react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/navigation/Tabs';
import { AiSituationView } from '@/components/admin-ai/AiSituationView';
import { AiCapabilitiesView } from '@/components/admin-ai/AiCapabilitiesView';
import { AiPromptStudioView } from '@/components/admin-ai/AiPromptStudioView';
import { AiRightsBudgetsView } from '@/components/admin-ai/AiRightsBudgetsView';
import { AiJournalView } from '@/components/admin-ai/AiJournalView';
import type { AdminAiViewId } from '@/app/router';

const tabs = [
  ['situation', 'Situation', Activity],
  ['capacites', 'Capacités', KeyRound],
  ['prompts', 'Prompt Studio', MessageSquareText],
  ['droits', 'Droits et budgets', ShieldCheck],
  ['journal', 'Journal', FileText],
] as const;

export type AdminAiPanelProps = {
  view?: AdminAiViewId;
  onViewChange?: (view: AdminAiViewId) => void;
};

const AdminAiPanel = ({ view, onViewChange }: AdminAiPanelProps) => {
  const [internalTab, setInternalTab] = useState<string>('situation');
  const activeTab = view ?? internalTab;

  const handleTabChange = (nextTab: string) => {
    setInternalTab(nextTab);
    onViewChange?.(nextTab as AdminAiViewId);
  };

  return (
    <section className="space-y-4 pb-6" data-testid="admin-ai-panel">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Bot className="size-5 text-primary" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-foreground">Gestion IA</h2>
          </div>
          <p className="mt-1 max-w-[72ch] text-xs text-muted-foreground">
            Pilotez les capacités d’intelligence artificielle, l’affectation des modèles, les prompts publiés, les accès et le journal d’exécution.
          </p>
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-surface-1 p-1">
          {tabs.map(([value, label, Icon]) => (
            <TabsTrigger
              key={value}
              value={value}
              className="gap-1.5 px-3 py-2 text-xs"
              data-testid={`admin-ai-tab-${value}`}
            >
              <Icon className="size-3.5" aria-hidden="true" />
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="situation" className="mt-4">
          <AiSituationView onNavigate={(v) => handleTabChange(v)} />
        </TabsContent>

        <TabsContent value="capacites" className="mt-4">
          <AiCapabilitiesView />
        </TabsContent>

        <TabsContent value="prompts" className="mt-4">
          <AiPromptStudioView />
        </TabsContent>

        <TabsContent value="droits" className="mt-4">
          <AiRightsBudgetsView />
        </TabsContent>

        <TabsContent value="journal" className="mt-4">
          <AiJournalView />
        </TabsContent>
      </Tabs>
    </section>
  );
};

export default AdminAiPanel;
