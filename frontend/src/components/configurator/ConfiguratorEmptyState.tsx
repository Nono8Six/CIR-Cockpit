import type { LucideIcon } from 'lucide-react';
import { SearchX } from 'lucide-react';

import { Button } from '@/components/ui/inputs/basic/Button';
import { cn } from '@/lib/utils';

type ConfiguratorEmptyStateProps = {
  title: string;
  description: string;
  icon?: LucideIcon;
  /** Piste de sortie concrète. Une impasse sans issue n'est pas un état acceptable. */
  action?: { label: string; onClick: () => void };
  className?: string;
};

/**
 * Absence de resultat, distincte d'une absence de donnee.
 *
 * Un vide sans issue n'est pas un etat acceptable : l'ecran nomme toujours ce
 * qui a ete cherche et ce qui peut etre elargi.
 */
export const ConfiguratorEmptyState = ({
  title,
  description,
  icon: Icon = SearchX,
  action,
  className
}: ConfiguratorEmptyStateProps) => (
  <div
    className={cn(
      'flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-surface-1 px-6 py-10 text-center',
      className
    )}
  >
    <Icon aria-hidden="true" className="size-5 text-muted-foreground" />
    <p className="text-[13px] font-semibold text-foreground">{title}</p>
    <p className="max-w-md text-[12px] leading-snug text-muted-foreground">{description}</p>
    {action ? (
      <Button className="mt-1" variant="outline" size="sm" onClick={action.onClick}>
        {action.label}
      </Button>
    ) : null}
  </div>
);
