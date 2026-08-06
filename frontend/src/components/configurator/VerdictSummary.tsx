import type { ReactNode } from 'react';

import type { CriterionStatus } from 'shared/schemas/configurator/common.schema';

import { cn } from '@/lib/utils';
import {
  CONFIGURATOR_TONE_CELL,
  CONFIGURATOR_TONE_TEXT,
  VERDICT_ICONS,
  VERDICT_LABELS,
  VERDICT_SENTENCES,
  VERDICT_TONES
} from './configuratorVocabulary';
import { TechLabel } from './TechLabel';
import { VerdictMosaic, VerdictTally, type MosaicCell } from './VerdictMosaic';

type VerdictSummaryProps = {
  status: CriterionStatus;
  /**
   * Explication produite par le backend. Elle prime sur la phrase generique :
   * le frontend n'ecrit jamais lui-meme la raison d'un verdict.
   */
  explanation?: string;
  /** Criteres deja evalues, rendus en mosaïque au-dessus de la phrase. */
  cells?: readonly MosaicCell[];
  className?: string;
  children?: ReactNode;
};

/**
 * En-tete de verdict : la bande, l'etat, sa phrase, puis l'actionnable.
 *
 * Pas de carte arrondie ni d'ombre : un filet vertical plein a gauche marque
 * l'etat sur toute la hauteur, exactement comme un reperage de plan. La
 * formulation reste celle verrouillee par le plan directeur — le mot
 * « garantie » n'y figure jamais, l'outil etablit une compatibilite
 * documentaire qui reste a valider au montage.
 */
export const VerdictSummary = ({
  status,
  explanation,
  cells,
  className,
  children
}: VerdictSummaryProps) => {
  const Icon = VERDICT_ICONS[status];
  const tone = VERDICT_TONES[status];

  return (
    <section
      className={cn('flex border border-border bg-card', className)}
      data-verdict={status}
      aria-label={`Verdict : ${VERDICT_LABELS[status]}`}
    >
      <span
        aria-hidden="true"
        className={cn('w-1 shrink-0', CONFIGURATOR_TONE_CELL[tone])}
      />
      <div className="min-w-0 flex-1 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TechLabel className={CONFIGURATOR_TONE_TEXT[tone]}>
            <Icon aria-hidden="true" className="mr-1.5 inline size-3.5 align-[-2px]" />
            {VERDICT_LABELS[status]}
          </TechLabel>
          {cells && cells.length > 0 ? <VerdictMosaic cells={cells} /> : null}
        </div>
        <p className="mt-2 max-w-prose text-[14px] leading-snug text-foreground">
          {explanation ?? VERDICT_SENTENCES[status]}
        </p>
        {cells && cells.length > 0 ? <VerdictTally className="mt-2.5" cells={cells} /> : null}
        {children ? <div className="mt-4 space-y-3">{children}</div> : null}
      </div>
    </section>
  );
};
