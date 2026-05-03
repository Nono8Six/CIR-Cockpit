import { Pencil } from 'lucide-react';

import { cn } from '@/lib/utils';

type CockpitGuidedAnswerRowProps = {
  index: number;
  label: string;
  value: string;
  meta?: string;
  active: boolean;
  complete: boolean;
  onEdit: () => void;
};

const CockpitGuidedAnswerRow = ({
  index,
  label,
  value,
  meta,
  active,
  complete,
  onEdit
}: CockpitGuidedAnswerRowProps) => {
  const interactive = complete || active;

  return (
    <button
      type="button"
      onClick={onEdit}
      disabled={!interactive}
      className={cn(
        'group flex w-full items-center gap-4 px-2 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:bg-surface-1',
        interactive ? 'cursor-pointer hover:bg-surface-1/70' : 'cursor-default opacity-55'
      )}
      aria-current={active ? 'step' : undefined}
    >
      <span className="w-[72px] shrink-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            'block truncate text-sm',
            interactive ? 'font-medium text-foreground' : 'text-muted-foreground'
          )}
        >
          {complete ? value : `Étape ${index}`}
        </span>
        {meta ? (
          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
            {meta}
          </span>
        ) : null}
      </span>
      {complete ? (
        <span
          aria-hidden="true"
          className="flex size-7 shrink-0 items-center justify-center rounded-md text-transparent transition-colors group-hover:text-muted-foreground group-focus-visible:text-muted-foreground"
        >
          <Pencil size={13} />
        </span>
      ) : (
        <span aria-hidden="true" className="size-7" />
      )}
      {complete ? <span className="sr-only">Modifier {label}</span> : null}
    </button>
  );
};

export default CockpitGuidedAnswerRow;
