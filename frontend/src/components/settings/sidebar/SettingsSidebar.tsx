import type { LucideIcon } from 'lucide-react';
import { Boxes, History, ListTodo } from 'lucide-react';

import { cn } from '@/lib/utils';

type SidebarItem = {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
  icon: LucideIcon;
};

type SettingsSidebarProps = {
  activeSection: string;
  readOnly: boolean;
  isDirty: boolean;
  onSectionChange: (sectionId: string) => void;
  unresolvedCount: number;
};

const SIDEBAR_ITEMS: SidebarItem[] = [
  { id: 'workflow', label: 'Statuts interactions', shortLabel: 'Statuts', description: 'Workflow', icon: ListTodo },
  { id: 'lists', label: 'Listes de saisie', shortLabel: 'Listes', description: 'Formulaires', icon: Boxes },
  { id: 'integrity', label: 'Historique & intégrité', shortLabel: 'Historique', description: 'Audit', icon: History },
];

const SettingsSidebar = ({
  activeSection,
  readOnly,
  isDirty,
  onSectionChange,
  unresolvedCount,
}: SettingsSidebarProps) => {
  const handleClick = (id: string) => {
    onSectionChange(id);
  };

  return (
    <aside className="min-w-0" aria-label="Pilotage des paramètres">
      <div className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
        <div className="hidden shrink-0 items-center gap-2 sm:flex">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Paramètres
          </h3>
          {isDirty && !readOnly && (
            <span className="border border-primary/20 bg-primary/5 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
              Modifié
            </span>
          )}
        </div>
        <nav className="grid min-w-0 flex-1 grid-cols-3 gap-1 sm:flex sm:overflow-x-auto" aria-label="Navigation des paramètres">
          {SIDEBAR_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleClick(item.id)}
                className={cn(
                  'flex min-w-0 items-center justify-center gap-1.5 whitespace-nowrap border px-2 py-2 text-center transition-[background-color,border-color,color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 sm:min-w-fit sm:justify-start sm:px-2.5 sm:py-1.5 sm:text-left',
                  isActive
                    ? 'border-primary/30 bg-accent text-accent-foreground font-semibold shadow-sm'
                    : 'border-transparent text-muted-foreground hover:border-border hover:bg-background hover:text-foreground'
                )}
                aria-label={`${item.label}, ${item.description}`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="size-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate text-xs font-semibold sm:hidden">{item.shortLabel}</span>
                <span className="hidden text-xs font-semibold sm:inline">{item.label}</span>
                {item.id === 'integrity' && unresolvedCount > 0 ? <span className="ml-auto bg-warning/20 px-1.5 py-0.5 font-mono text-[10px] text-warning-foreground">{unresolvedCount}</span> : null}
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};

export default SettingsSidebar;
