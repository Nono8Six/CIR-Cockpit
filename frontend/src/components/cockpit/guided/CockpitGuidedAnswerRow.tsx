import { Check, Pencil } from 'lucide-react';

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
}: CockpitGuidedAnswerRowProps) => (
  <button
    type="button"
    onClick={onEdit}
    disabled={!complete && !active}
    className={cn(
      'grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-md border px-3 py-2 text-left transition-colors',
      active
        ? 'border-ring/45 bg-primary/10 text-foreground shadow-sm'
        : 'border-border bg-card/95 text-muted-foreground hover:border-ring/30 hover:bg-surface-1',
      !complete && !active ? 'cursor-default opacity-45 hover:border-border hover:bg-card/95' : ''
    )}
    aria-current={active ? 'step' : undefined}
  >
    <span className={cn(
      'flex h-6 w-6 items-center justify-center rounded-md border text-[11px] font-bold',
      complete ? 'border-success/25 bg-success/10 text-success' : 'border-border bg-surface-1 text-muted-foreground'
    )}>
      {complete ? <Check size={12} aria-hidden="true" /> : index}
    </span>
    <span className="min-w-0">
      <span className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="block truncate text-sm font-semibold text-foreground">
        {value}
      </span>
      {meta ? (
        <span className="block truncate text-xs text-muted-foreground">
          {meta}
        </span>
      ) : null}
    </span>
    {complete ? (
      <Pencil size={13} className="text-muted-foreground" aria-hidden="true" />
    ) : null}
  </button>
);

export default CockpitGuidedAnswerRow;
