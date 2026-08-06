import { motorMountingSchema, type MotorMounting } from 'shared/schemas/configurator/motor.schema';

import { cn } from '@/lib/utils';
import { MOUNTING_CRITERIA } from './configuratorVocabulary';

type MountingSelectorProps = {
  value: MotorMounting | null;
  onChange: (mounting: MotorMounting) => void;
  className?: string;
};

/**
 * Choix de la forme de montage.
 *
 * Le montage n'est pas un champ parmi d'autres : il decide quels criteres seront
 * controles. Chaque option annonce donc les cotes qu'elle engage, pour qu'on ne
 * decouvre pas apres coup qu'en B3 mesurer bride et arbre ne suffit pas.
 */
export const MountingSelector = ({ value, onChange, className }: MountingSelectorProps) => (
  <div className={cn('grid grid-cols-5 gap-1', className)} role="group" aria-label="Forme de montage">
    {motorMountingSchema.options.map((mounting) => {
      const isSelected = value === mounting;
      const criteria = MOUNTING_CRITERIA[mounting];
      return (
        <button
          key={mounting}
          type="button"
          onClick={() => { onChange(mounting); }}
          aria-pressed={isSelected}
          title={`Cotes contrôlées : ${criteria.frame.join(' ')} · arbre ${criteria.shaft.join(' ')}`}
          className={cn(
            'flex flex-col items-center gap-0.5 rounded-lg border px-1 py-1.5 transition-colors duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background motion-reduce:transition-none',
            isSelected
              ? 'border-foreground bg-foreground text-background'
              : 'border-border bg-card text-foreground hover:bg-surface-1'
          )}
        >
          <span className="font-mono text-[12px] font-semibold leading-none">{mounting}</span>
          <span
            className={cn(
              'text-[11px] leading-none',
              isSelected ? 'text-background/70' : 'text-muted-foreground'
            )}
          >
            {criteria.frame.length + criteria.shaft.length} cotes
          </span>
        </button>
      );
    })}
  </div>
);
