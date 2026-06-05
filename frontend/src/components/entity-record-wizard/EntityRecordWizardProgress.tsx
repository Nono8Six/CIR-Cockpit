import { Check, ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';

interface WizardStepItem {
  id: string;
  title: string;
}

interface EntityRecordWizardProgressProps {
  steps: WizardStepItem[];
  currentIndex: number;
  onCompletedStepClick?: (stepId: string) => void;
  label: string;
}

export const EntityRecordWizardProgress = ({
  steps,
  currentIndex,
  onCompletedStepClick,
  label
}: EntityRecordWizardProgressProps) => (
  <nav aria-label={label} className="min-w-0">
    <ol className="flex min-w-0 items-center gap-1 rounded-lg border border-border-subtle bg-surface-2/70 p-1">
      {steps.map((step, index) => {
        const isCurrent = currentIndex === index;
        const isCompleted = index < currentIndex;
        const content = (
          <>
            <span
              className={cn(
                'flex size-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold',
                isCompleted && 'bg-success text-success-foreground',
                isCurrent && 'bg-primary text-primary-foreground',
                !isCompleted && !isCurrent && 'border border-border bg-background text-muted-foreground/60'
              )}
            >
              {isCompleted ? <Check aria-hidden="true" className="size-2.5" /> : index + 1}
            </span>
            <span className="truncate">{step.title}</span>
          </>
        );

        return (
          <li key={step.id} className="flex min-w-0 items-center gap-1" aria-current={isCurrent ? 'step' : undefined}>
            {isCompleted && onCompletedStepClick ? (
              <button
                type="button"
                aria-label={`Revenir à l'étape ${step.title}`}
                onClick={() => onCompletedStepClick(step.id)}
                className="flex h-7 min-w-0 items-center gap-1.5 rounded-md px-2.5 text-[12px] font-medium text-muted-foreground transition-[background-color,color,box-shadow] hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35"
              >
                {content}
              </button>
            ) : (
              <div
                className={cn(
                  'flex h-7 min-w-0 items-center gap-1.5 rounded-md border px-2.5 text-[12px] transition-[background-color,color,border-color,box-shadow]',
                  isCurrent
                    ? 'border-border bg-background font-semibold text-foreground shadow-sm'
                    : 'border-transparent font-medium text-muted-foreground/55'
                )}
              >
                {content}
              </div>
            )}
            {index < steps.length - 1 ? (
              <ChevronRight aria-hidden="true" className="size-3 shrink-0 text-muted-foreground/35" />
            ) : null}
          </li>
        );
      })}
    </ol>
  </nav>
);
