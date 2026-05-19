import type { LucideIcon } from 'lucide-react';
import { Layers3, Sparkles, Boxes, ListTodo } from 'lucide-react';

type SidebarItem = {
  id: string;
  label: string;
  icon: LucideIcon;
};

type SettingsSidebarProps = {
  activeSection: string;
  onSectionChange: (sectionId: string) => void;
};

const SIDEBAR_ITEMS: SidebarItem[] = [
  { id: 'general', label: 'Général', icon: Layers3 },
  { id: 'product', label: 'Produits', icon: Sparkles },
  { id: 'referentials', label: 'Référentiels', icon: Boxes },
  { id: 'kanban', label: 'Statuts', icon: ListTodo },
];

/**
 * Left-aligned sidebar navigation for settings categories.
 * Allows quick jumping and features responsive behavior.
 */
const SettingsSidebar = ({ activeSection, onSectionChange }: SettingsSidebarProps) => {
  const handleClick = (id: string) => {
    onSectionChange(id);
    const element = document.getElementById(`settings-section-${id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <nav
      className="sticky top-0 flex flex-row gap-1 rounded-lg border border-border/60 bg-card/50 p-1 backdrop-blur-sm lg:flex-col lg:p-1.5"
      aria-label="Navigation des paramètres"
    >
      {SIDEBAR_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = activeSection === item.id;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => handleClick(item.id)}
            className={`flex flex-1 items-center justify-center gap-2.5 rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-all lg:flex-none lg:justify-start lg:px-4 lg:py-2.5 ${
              isActive
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            <span className="hidden sm:inline lg:inline">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default SettingsSidebar;
