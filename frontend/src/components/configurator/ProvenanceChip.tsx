import { BadgeCheck, BookMarked, Gauge, Ruler, Sigma } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import type {
  ConstraintConfirmation,
  ConstraintOrigin
} from 'shared/schemas/configurator/common.schema';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/feedback/Tooltip';
import { cn } from '@/lib/utils';
import {
  CONFIRMATION_LABELS,
  ORIGIN_DESCRIPTIONS,
  ORIGIN_LABELS,
  ORIGIN_SHORT_LABELS
} from './configuratorVocabulary';

const ORIGIN_ICONS: Record<ConstraintOrigin, LucideIcon> = {
  nameplate: Gauge,
  user_measurement: Ruler,
  catalog: BookMarked,
  statistical_suggestion: Sigma,
  calculation: Sigma
};

type ProvenanceChipProps = {
  origin: ConstraintOrigin;
  confirmation?: ConstraintConfirmation;
  className?: string;
};

/**
 * D'ou vient une valeur, et si elle a ete confirmee.
 *
 * Aucun cadre, aucun fond : icone et libelle, comme un attribut de fiche. Le
 * chrome n'apporte rien et alourdit une page qui en portera des dizaines.
 * Une valeur non confirmee est soulignee d'une trame hachuree — le meme signe
 * que l'absence, parce qu'une suggestion non confirmee n'est pas encore un fait.
 *
 * Une origine `user_measurement` n'est jamais presentee comme verifiee : une
 * mesure terrain peut etre fausse.
 *
 * La puce n'est volontairement pas focusable : dans un tableau dense elle
 * ajouterait des dizaines d'arrets de tabulation. L'information complete reste
 * disponible aux lecteurs d'ecran par le texte `sr-only`, et au clavier par le
 * dialog de preuves, qui est le chemin principal.
 */
export const ProvenanceChip = ({ origin, confirmation, className }: ProvenanceChipProps) => {
  const Icon = ORIGIN_ICONS[origin];
  const isUnconfirmed = confirmation === 'unconfirmed';
  const description = confirmation
    ? `${ORIGIN_LABELS[origin]} — ${CONFIRMATION_LABELS[confirmation]}. ${ORIGIN_DESCRIPTIONS[origin]}`
    : `${ORIGIN_LABELS[origin]}. ${ORIGIN_DESCRIPTIONS[origin]}`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            'inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.08em]',
            isUnconfirmed ? 'text-warning-strong' : 'text-muted-foreground',
            className
          )}
          data-origin={origin}
          data-confirmation={confirmation ?? 'unspecified'}
        >
          <Icon aria-hidden="true" className="size-3 shrink-0" />
          <span className={cn(isUnconfirmed && 'tech-hatch bg-warning/10 px-0.5')}>
            {ORIGIN_SHORT_LABELS[origin]}
          </span>
          {confirmation === 'confirmed' ? (
            <BadgeCheck aria-hidden="true" className="size-3 shrink-0 text-success" />
          ) : null}
          <span className="sr-only">{description}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-[11px] leading-snug">{description}</TooltipContent>
    </Tooltip>
  );
};
