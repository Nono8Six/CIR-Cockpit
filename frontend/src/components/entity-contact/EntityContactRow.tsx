import { CheckCircle2, ChevronRight } from 'lucide-react';
import type { ReactNode, Ref } from 'react';

import AvatarInitials from '@/components/ui/avatar-initials';
import type { EntityContact } from '@/types';
import { cn } from '@/lib/utils';
import { getEntityContactDetail, getEntityContactName } from './entityContactRow.utils';

type EntityContactRowVariant = 'default' | 'selectable' | 'selected' | 'focused';

interface EntityContactRowProps {
  contact: EntityContact;
  variant?: EntityContactRowVariant;
  onSelect?: (contact: EntityContact) => void;
  buttonRef?: Ref<HTMLButtonElement>;
  actions?: ReactNode;
  className?: string;
  emptyDetailLabel?: string;
}

const getRowClassName = (
  variant: EntityContactRowVariant,
  isButton: boolean,
  className?: string
): string => cn(
  'group grid min-h-[54px] w-full grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-md border px-2.5 py-2 text-left text-sm transition-[background-color,border-color,box-shadow,transform]',
  variant === 'selected'
    ? 'border-foreground/15 bg-primary/[0.025] shadow-[inset_2px_0_0_0_hsl(var(--primary)/0.55)]'
    : 'border-border/70 bg-card/90',
  variant === 'focused' && 'border-ring bg-primary/[0.04]',
  isButton && 'hover:border-foreground/20 hover:bg-surface-1/70 hover:shadow-soft active:scale-[0.995] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
  !isButton && 'hover:bg-surface-1/50',
  className
);

const EntityContactRow = ({
  contact,
  variant = 'default',
  onSelect,
  buttonRef,
  actions,
  className,
  emptyDetailLabel
}: EntityContactRowProps) => {
  const name = getEntityContactName(contact);
  const detail = getEntityContactDetail(contact, emptyDetailLabel);
  const content = (
    <>
      <AvatarInitials name={name} size="sm" className="rounded-md" />
      <span className="min-w-0">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate font-semibold leading-5 text-foreground">{name}</span>
          {variant === 'selected' ? (
            <CheckCircle2 size={13} className="shrink-0 text-primary" aria-hidden="true" />
          ) : null}
        </span>
        <span className="block truncate text-[12px] leading-4 text-muted-foreground">
          {detail}
        </span>
      </span>
      <span className="flex shrink-0 items-center justify-end gap-1.5">
        {actions}
        {variant === 'selectable' ? (
          <ChevronRight
            size={14}
            aria-hidden="true"
            className="text-muted-foreground/35 transition-colors group-hover:text-muted-foreground"
          />
        ) : null}
      </span>
    </>
  );

  if (onSelect) {
    return (
      <button
        type="button"
        ref={buttonRef}
        onClick={() => onSelect(contact)}
        className={getRowClassName(variant, true, className)}
        aria-label={`Sélectionner ${name}`}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={getRowClassName(variant, false, className)}>
      {content}
    </div>
  );
};

export default EntityContactRow;
