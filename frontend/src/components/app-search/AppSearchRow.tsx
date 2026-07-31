import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';
import { CommandItem } from '../ui/inputs/selects/Command';

type AppSearchRowProps = {
  /** Chaine de correspondance cmdk : doit rester unique dans la liste. */
  value: string;
  onSelect: () => void;
  icon: LucideIcon;
  label: ReactNode;
  /** Precision affichee juste apres le libelle, sur la meme ligne. */
  detail?: ReactNode;
  /** Valeur alignee a droite : numero, date, raccourci. */
  meta?: ReactNode;
  trailing?: ReactNode;
  testId?: string;
};

/**
 * Rangee unique de la palette. Toutes les sections passent par ici pour que la
 * densite, l'alignement et l'etat selectionne ne puissent pas diverger.
 * La selection n'utilise pas `accent` (teinte rouge de la marque, qui se lit
 * comme une alerte) mais une surface neutre plus un filet primaire a gauche.
 */
const AppSearchRow = ({
  value,
  onSelect,
  icon: Icon,
  label,
  detail,
  meta,
  trailing,
  testId
}: AppSearchRowProps) => (
  <CommandItem
    value={value}
    onSelect={onSelect}
    data-testid={testId}
    className={cn(
      'relative mx-1 gap-2.5 rounded-md px-2.5 py-1.5 text-[13px]',
      'before:absolute before:inset-y-1 before:left-0 before:w-[2px] before:rounded-full before:bg-primary before:opacity-0 before:transition-opacity',
      'data-[selected=true]:bg-surface-2 data-[selected=true]:text-foreground data-[selected=true]:before:opacity-100'
    )}
  >
    <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    <span className="min-w-0 flex-1 truncate">
      <span className="font-medium text-foreground">{label}</span>
      {detail ? <span className="ml-2 text-muted-foreground">{detail}</span> : null}
    </span>
    {meta ? (
      <span className="max-w-[12rem] shrink-0 truncate font-mono text-[11px] tabular-nums text-muted-foreground">
        {meta}
      </span>
    ) : null}
    {trailing}
  </CommandItem>
);

export default AppSearchRow;
