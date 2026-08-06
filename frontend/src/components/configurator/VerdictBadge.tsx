import type { CriterionStatus } from 'shared/schemas/configurator/common.schema';

import { cn } from '@/lib/utils';
import {
  CONFIGURATOR_TONE_CHIP,
  VERDICT_ICONS,
  VERDICT_LABELS,
  VERDICT_SHORT_LABELS,
  VERDICT_TONES
} from './configuratorVocabulary';

type VerdictBadgeProps = {
  status: CriterionStatus;
  /** `short` pour les contextes denses, `full` par defaut. */
  variant?: 'full' | 'short';
  /** Masque le libelle et ne garde que l'icone, avec un texte accessible. */
  iconOnly?: boolean;
  className?: string;
};

/**
 * Representation unique des quatre etats metier.
 *
 * Puce teintee : fond a faible opacite, texte de la meme famille chromatique.
 * Assez coloree pour se reperer au balayage d'une liste, assez sobre pour qu'un
 * ecran en supporte cinquante sans devenir un sapin de Noel.
 *
 * Le statut est encode trois fois — teinte, icone, libelle — pour rester
 * lisible en niveaux de gris comme en vision des couleurs alteree.
 */
export const VerdictBadge = ({
  status,
  variant = 'full',
  iconOnly = false,
  className
}: VerdictBadgeProps) => {
  const Icon = VERDICT_ICONS[status];
  const label = variant === 'short' ? VERDICT_SHORT_LABELS[status] : VERDICT_LABELS[status];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium',
        CONFIGURATOR_TONE_CHIP[VERDICT_TONES[status]],
        className
      )}
      data-verdict={status}
    >
      <Icon aria-hidden="true" className="size-3 shrink-0" />
      {iconOnly ? <span className="sr-only">{label}</span> : <span>{label}</span>}
    </span>
  );
};
