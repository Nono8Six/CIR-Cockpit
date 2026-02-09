import { Check } from 'lucide-react';

type StepStatus = 'complete' | 'current' | 'upcoming';

type Step = {
  label: string;
  status: StepStatus;
};

interface InteractionStepperProps {
  steps: Step[];
}

const STATUS_CLASSES: Record<StepStatus, { circle: string; label: string; line: string }> = {
  complete: {
    circle: 'bg-cir-red text-white border-cir-red',
    label: 'text-slate-700',
    line: 'bg-cir-red'
  },
  current: {
    circle: 'bg-white text-cir-red border-cir-red ring-2 ring-cir-red/20',
    label: 'text-slate-900',
    line: 'bg-slate-200'
  },
  upcoming: {
    circle: 'bg-slate-100 text-slate-400 border-slate-200',
    label: 'text-slate-400',
    line: 'bg-slate-200'
  }
};

const MOBILE_LABELS = ['Canal', 'Rel.', 'Ident.', 'Contact', 'Type'];

const InteractionStepper = ({ steps }: InteractionStepperProps) => (
  <ol data-testid="cockpit-stepper" className="grid grid-cols-5 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-2" aria-label="Processus de saisie">
    {steps.map((step, index) => {
      const styles = STATUS_CLASSES[step.status];
      const isComplete = step.status === 'complete';
      const isCurrent = step.status === 'current';
      const mobileLabel = MOBILE_LABELS[index] ?? `Etape ${index + 1}`;
      return (
        <li
          key={step.label}
          className="min-w-0 flex flex-col items-center gap-1 text-center sm:flex-row sm:items-center sm:gap-2 sm:text-left"
          aria-current={isCurrent ? 'step' : undefined}
        >
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold ${styles.circle}`}
            aria-hidden="true"
          >
            {isComplete ? <Check size={14} /> : index + 1}
          </span>
          <span className={`w-full truncate text-xs font-semibold uppercase tracking-wide sm:hidden ${styles.label}`}>
            {mobileLabel}
          </span>
          <span className={`hidden text-xs font-semibold uppercase tracking-wide whitespace-nowrap sm:inline ${styles.label}`}>
            {step.label}
          </span>
          {index < steps.length - 1 && (
            <span className={`hidden md:block h-px w-8 lg:w-12 ${styles.line}`} aria-hidden="true" />
          )}
        </li>
      );
    })}
  </ol>
);

export default InteractionStepper;
