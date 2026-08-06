import { CircleDashed } from 'lucide-react';

import { cn } from '@/lib/utils';

type PartialResultNoticeProps = {
  /** Ce qui a pu être établi. */
  established: string;
  /** Ce qui reste hors de portée avec les données disponibles. */
  limitation: string;
  className?: string;
};

/**
 * Resultat partiel : ce qui est etabli, ce qui ne l'est pas.
 *
 * Un resultat incomplet n'est jamais presente comme complet, et jamais masque
 * non plus. Les deux moities sont enoncees cote a cote pour que l'utilisateur
 * sache exactement jusqu'ou il peut s'engager.
 */
export const PartialResultNotice = ({
  established,
  limitation,
  className
}: PartialResultNoticeProps) => (
  <div
    className={cn('rounded-md border border-border bg-surface-1 p-3', className)}
    role="status"
  >
    <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      <CircleDashed aria-hidden="true" className="size-3.5 shrink-0" />
      Résultat partiel
    </p>
    <dl className="mt-1.5 space-y-1 text-[12px] leading-snug">
      <div className="flex gap-2">
        <dt className="shrink-0 font-medium text-foreground">Établi</dt>
        <dd className="text-muted-foreground">{established}</dd>
      </div>
      <div className="flex gap-2">
        <dt className="shrink-0 font-medium text-foreground">Hors de portée</dt>
        <dd className="text-muted-foreground">{limitation}</dd>
      </div>
    </dl>
  </div>
);
