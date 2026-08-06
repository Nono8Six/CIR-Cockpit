import type { CriterionStatus } from 'shared/schemas/configurator/common.schema';

import { cn } from '@/lib/utils';
import {
  CONFIGURATOR_TONE_CELL,
  CONFIGURATOR_TONE_TEXT,
  VERDICT_ICONS,
  VERDICT_LABELS,
  VERDICT_SENTENCES,
  VERDICT_SEVERITY_ORDER,
  VERDICT_TONES
} from './configuratorVocabulary';

const LEGEND_ORDER: readonly CriterionStatus[] = [...VERDICT_SEVERITY_ORDER].reverse();

type VerdictLegendProps = {
  className?: string;
};

/**
 * Contrat de lecture du configurateur, enonce avant tout resultat.
 *
 * Ce n'est pas une legende decorative : c'est la definition des quatre seuls
 * etats que l'outil sait produire, et la raison pour laquelle il n'en produit
 * jamais un cinquieme. Chaque etat est presente avec sa matiere reelle — le
 * meme pave que celui qui apparaitra dans la mosaique — pour qu'un utilisateur
 * qui l'a lue une fois reconnaisse ensuite une bande sans legende.
 */
export const VerdictLegend = ({ className }: VerdictLegendProps) => (
  <div className={cn('border border-border bg-card', className)}>
    <div className="border-b border-border p-5">
      <p className="max-w-3xl text-[15px] leading-snug text-foreground">
        Le configurateur établit une{' '}
        <strong className="font-semibold">compatibilité documentaire</strong>, à partir des
        catalogues techniques constructeurs et des mesures que vous confirmez.{' '}
        <span className="text-muted-foreground">
          La validation finale reste celle du montage. Chaque critère reçoit l’un de ces quatre
          états, et aucun autre.
        </span>
      </p>
    </div>
    <ul className="grid sm:grid-cols-2">
      {LEGEND_ORDER.map((status) => {
        const Icon = VERDICT_ICONS[status];
        const tone = VERDICT_TONES[status];
        return (
          <li
            key={status}
            className="flex gap-3 border-b border-border-subtle p-4 last:border-b-0 sm:border-r sm:[&:nth-child(3)]:border-b-0 sm:[&:nth-child(even)]:border-r-0"
            data-verdict={status}
          >
            <span
              aria-hidden="true"
              className={cn('mt-0.5 h-8 w-1 shrink-0 rounded-full', CONFIGURATOR_TONE_CELL[tone])}
            />
            <div className="min-w-0">
              <p className="flex items-center gap-1.5">
                <Icon
                  aria-hidden="true"
                  className={cn('size-3.5 shrink-0', CONFIGURATOR_TONE_TEXT[tone])}
                />
                <span className="text-[13px] font-semibold text-foreground">
                  {VERDICT_LABELS[status]}
                </span>
              </p>
              <p className="mt-1 text-[12px] leading-snug text-muted-foreground">
                {VERDICT_SENTENCES[status]}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  </div>
);
