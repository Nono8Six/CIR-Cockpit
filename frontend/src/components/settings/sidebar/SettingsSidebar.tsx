import type { LucideIcon } from 'lucide-react';
import { Boxes, ListTodo } from 'lucide-react';

import { cn } from '@/lib/utils';

type SidebarItem = {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

type SettingsSidebarProps = {
  activeSection: string;
  readOnly: boolean;
  isDirty: boolean;
  onSectionChange: (sectionId: string) => void;
};

const SIDEBAR_ITEMS: SidebarItem[] = [
  { id: 'workflow', label: 'Statuts interactions', description: 'Workflow', icon: ListTodo },
  { id: 'lists', label: 'Listes de saisie', description: 'Formulaires', icon: Boxes },
];

const SettingsSidebar = ({
  activeSection,
  readOnly,
  isDirty,
  onSectionChange,
}: SettingsSidebarProps) => {
  const handleClick = (id: string) => {
    onSectionChange(id);
  };

  return (
    <aside className="sticky top-0 space-y-3" aria-label="Pilotage des paramètres">
      <div className="border border-border/70 bg-card p-3 shadow-soft">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Paramètres
          </h3>
          {isDirty && !readOnly && (
            <span className="bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
              Modifié
            </span>
          )}
        </div>
        <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible" aria-label="Navigation des paramètres">
          {SIDEBAR_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleClick(item.id)}
                className={cn(
                  'flex min-w-[9rem] items-center gap-2 px-3 py-2 text-left transition-[background-color,color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 lg:min-w-0 border-l-2',
                  isActive
                    ? 'bg-accent text-accent-foreground border-primary font-semibold shadow-sm'
                    : 'text-muted-foreground hover:bg-surface-1 hover:text-foreground border-transparent'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block truncate text-xs font-semibold">{item.label}</span>
                  <span className="hidden truncate text-[10px] text-current opacity-70 lg:block">
                    {item.description}
                  </span>
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};

export default SettingsSidebar;
