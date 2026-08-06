import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type TechLabelProps = {
  children: ReactNode;
  /**
   * `section` : intitulé de section, casse normale — la lecture courante.
   * `mono` : identifiant ou métadonnée technique, monospace capitales.
   */
  tone?: 'section' | 'mono';
  as?: 'span' | 'p' | 'h2' | 'h3' | 'dt';
  className?: string;
};

/**
 * Libelle secondaire de la brique.
 *
 * Le monospace capitales est reserve a ce qui est litteralement technique — une
 * empreinte, un code, un montage. Passe partout, il donne un ton de terminal
 * qui alourdit la lecture et fait vieillir l'interface ; les intitules de
 * section restent donc en casse normale.
 */
export const TechLabel = ({
  children,
  tone = 'section',
  as: Component = 'span',
  className
}: TechLabelProps) => (
  <Component
    className={cn(
      'inline-flex items-center',
      tone === 'mono'
        ? 'font-mono text-[11px] font-medium uppercase leading-none tracking-[0.1em] text-muted-foreground'
        : 'text-[12px] font-medium leading-none text-muted-foreground',
      className
    )}
  >
    {children}
  </Component>
);
