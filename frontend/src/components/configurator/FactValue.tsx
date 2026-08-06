import { cn } from '@/lib/utils';

export type FactAbsenceReason = 'not_published' | 'to_measure' | 'indeterminate' | 'not_applicable';

const ABSENCE_LABELS: Record<FactAbsenceReason, string> = {
  not_published: 'Non publié',
  to_measure: 'À mesurer',
  indeterminate: 'Indéterminé',
  not_applicable: 'Sans objet'
};

const ABSENCE_DESCRIPTIONS: Record<FactAbsenceReason, string> = {
  not_published: 'Le catalogue constructeur ne publie pas cette valeur.',
  to_measure: 'Cette valeur doit être relevée sur le terrain puis confirmée.',
  indeterminate: 'Aucune valeur fondée n’est disponible.',
  not_applicable: 'Ce critère ne s’applique pas à cette configuration.'
};

type FactValueProps = {
  value: string | number | boolean | null;
  unit?: string;
  /** Motif de l'absence. Une valeur absente n'est jamais rendue par un zero. */
  absenceReason?: FactAbsenceReason;
  /** `lg` pour une valeur mise en avant sur une fiche. */
  size?: 'md' | 'lg';
  className?: string;
};

const formatValue = (value: string | number | boolean): string => {
  if (typeof value === 'boolean') {
    return value ? 'Oui' : 'Non';
  }
  if (typeof value === 'number') {
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 3 }).format(value);
  }
  return value;
};

/**
 * Valeur d'un fait, ou son absence explicite.
 *
 * Une donnee absente reste absente : jamais zero, jamais une valeur de
 * remplacement, jamais une cellule vide. L'absence recoit sa propre matiere —
 * une trame hachuree a la place du chiffre — pour qu'elle se voie a la meme
 * distance qu'une valeur, et le motif est toujours nomme parce qu'il dicte
 * l'action suivante.
 */
export const FactValue = ({
  value,
  unit,
  absenceReason = 'indeterminate',
  size = 'md',
  className
}: FactValueProps) => {
  const valueSize = size === 'lg' ? 'text-[18px]' : 'text-[13px]';

  if (value === null) {
    return (
      <span
        className={cn('inline-flex items-center gap-1.5', className)}
        title={ABSENCE_DESCRIPTIONS[absenceReason]}
        data-absence={absenceReason}
      >
        <span
          aria-hidden="true"
          className={cn(
            'tech-hatch inline-block w-7 border border-border/70 bg-surface-2',
            size === 'lg' ? 'h-[18px]' : 'h-3.5'
          )}
        />
        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
          {ABSENCE_LABELS[absenceReason]}
        </span>
        <span className="sr-only">{ABSENCE_DESCRIPTIONS[absenceReason]}</span>
      </span>
    );
  }

  return (
    <span className={cn('inline-flex items-baseline gap-1', className)}>
      <span className={cn('font-mono tabular-nums text-foreground', valueSize)}>
        {formatValue(value)}
      </span>
      {unit ? (
        <span className="font-mono text-[11px] text-muted-foreground">{unit}</span>
      ) : null}
    </span>
  );
};
