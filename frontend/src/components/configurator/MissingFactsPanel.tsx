import { cn } from '@/lib/utils';
import { TechLabel } from './TechLabel';
import {
  MOTOR_FACT_FAMILY_LABELS,
  MOTOR_FACT_RESOLUTION,
  getMotorFactLabel,
  groupMotorFactsByFamily,
  type MotorFactPath
} from './motorFactLabels';

type MissingFactsPanelProps = {
  missingFacts: readonly MotorFactPath[];
  className?: string;
};

/**
 * Ce qui manque pour conclure, regroupe par famille et assorti de l'action a
 * mener.
 *
 * L'absence est traitee comme une information de premier plan : chaque fait
 * manquant recoit la meme trame hachuree que les valeurs absentes ailleurs dans
 * la brique, pour qu'un seul signe visuel veuille dire « pas de donnee » partout.
 * Rien n'est comble par defaut, ni par une norme, ni par une moyenne.
 */
export const MissingFactsPanel = ({ missingFacts, className }: MissingFactsPanelProps) => {
  if (missingFacts.length === 0) {
    return null;
  }

  const groups = groupMotorFactsByFamily(missingFacts);

  return (
    <section
      className={cn('tech-raised overflow-hidden rounded-xl bg-card', className)}
      aria-label="Faits manquants"
    >
      <div className="flex items-baseline gap-2 border-b border-border-subtle px-4 py-3">
        <span className="font-mono text-[15px] font-semibold tabular-nums text-foreground">
          {missingFacts.length}
        </span>
        <TechLabel className="flex-1">
          {missingFacts.length === 1 ? 'fait manquant' : 'faits manquants'}
        </TechLabel>
      </div>
      <div className="divide-y divide-border">
        {groups.map((group) => (
          <div key={group.family} className="px-4 py-3">
            <TechLabel as="p">{MOTOR_FACT_FAMILY_LABELS[group.family]}</TechLabel>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {group.factPaths.map((factPath) => (
                <li
                  key={factPath}
                  className="tech-hatch border border-border bg-surface-1 px-1.5 py-0.5 text-[11px] text-foreground"
                >
                  {getMotorFactLabel(factPath)}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[12px] leading-snug text-muted-foreground">
              {MOTOR_FACT_RESOLUTION[group.family]}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};
