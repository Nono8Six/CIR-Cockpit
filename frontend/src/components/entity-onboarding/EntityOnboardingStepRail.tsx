import { ShieldCheck, Sparkles } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { OnboardingSourceLabel } from './entityOnboarding.types';

type EntityOnboardingStepRailStep = {
  id: string;
  title: string;
  description: string;
};

interface EntityOnboardingStepRailProps {
  className?: string;
  currentIndex: number;
  progress: number;
  sourceLabel: OnboardingSourceLabel;
  steps: EntityOnboardingStepRailStep[];
  onStepSelect?: (stepId: string) => void;
}

const EntityOnboardingStepRail = ({
  className,
  currentIndex,
  progress,
  sourceLabel,
  steps,
  onStepSelect
}: EntityOnboardingStepRailProps) => {
  return (
    <aside
      className={cn(
        'hidden min-h-0 w-[280px] shrink-0 flex-col border-r border-border-subtle bg-surface-1/80 xl:flex',
        className
      )}
    >
      <div className="flex h-full min-h-0 flex-col px-5 py-5">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <Badge variant="outline" density="dense" className="gap-1.5 border-border-subtle bg-background/90">
              <Sparkles className="size-3.5" />
              {sourceLabel}
            </Badge>
            <span className="text-xs font-medium text-muted-foreground">{progress}%</span>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Nouveau flux</p>
            <h2 className="text-[1.55rem] font-semibold tracking-tight text-foreground">
              Nouvelle fiche
            </h2>
            <p className="max-w-[23ch] text-sm leading-6 text-muted-foreground">
              Qualification, verification et creation dans le meme parcours.
            </p>
          </div>

          <div className="overflow-hidden rounded-full bg-border-subtle">
            <div
              className="h-1.5 rounded-full bg-primary transition-[width]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <ol className="mt-6 space-y-1.5">
          {steps.map((step, index) => {
            const isCurrent = currentIndex === index;
            const isCompleted = currentIndex > index;
            const isClickable = index < currentIndex && onStepSelect;
            const stepClasses = cn(
              'w-full rounded-lg border px-3 py-3 text-left transition-[background-color,border-color,color]',
              isCurrent
                ? 'border-primary/35 bg-primary/5'
                : isCompleted
                  ? 'border-border-subtle bg-background hover:border-primary/20 hover:bg-background'
                  : 'border-transparent bg-transparent text-muted-foreground'
            );
            const body = (
              <>
                <div className="flex items-center justify-between gap-3">
                  <span className={cn('text-sm font-medium', isCurrent || isCompleted ? 'text-foreground' : 'text-muted-foreground')}>
                    {step.title}
                  </span>
                  <span
                    className={cn(
                      'inline-flex min-w-6 items-center justify-center rounded-full border px-1.5 py-0.5 text-[11px] font-semibold tabular-nums',
                      isCurrent
                        ? 'border-primary/35 bg-primary/8 text-primary'
                        : isCompleted
                          ? 'border-success/30 bg-success/10 text-success'
                          : 'border-border-subtle text-muted-foreground'
                    )}
                  >
                    {index + 1}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{step.description}</p>
              </>
            );

            return (
              <li key={step.id} aria-current={isCurrent ? 'step' : undefined}>
                {isClickable ? (
                  <button
                    type="button"
                    onClick={() => {
                      onStepSelect(step.id);
                    }}
                    className={stepClasses}
                  >
                    {body}
                  </button>
                ) : (
                  <div className={stepClasses}>{body}</div>
                )}
              </li>
            );
          })}
        </ol>

        <div className="mt-auto rounded-lg border border-border-subtle bg-background px-4 py-4">
          <div className="flex items-start gap-3">
            <div className="rounded-md border border-primary/20 bg-primary/8 p-2 text-primary">
              <ShieldCheck className="size-4" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Controle officiel</p>
              <p className="text-xs leading-5 text-muted-foreground">
                Les donnees officielles et les doublons restent visibles en continu pendant le flux.
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default EntityOnboardingStepRail;

