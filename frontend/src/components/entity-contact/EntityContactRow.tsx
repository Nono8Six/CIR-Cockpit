import { CheckCircle2, ChevronRight } from 'lucide-react';
import type { ReactNode, Ref } from 'react';

import AvatarInitials from '../ui/data-display/AvatarInitials';
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

/**
 * Computes the className for a contact row based on state and interactivity.
 *
 * @param variant - The selection variant ('default', 'selectable', 'selected', 'focused').
 * @param isButton - True if the row is rendered as an interactive button.
 * @param className - Additional custom class names.
 * @returns Combined Tailwind class names.
 */
const getRowClassName = (
  variant: EntityContactRowVariant,
  isButton: boolean,
  className?: string
): string => cn(
  'group grid min-h-[48px] w-full grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-3 rounded-md border px-3 py-2 text-left text-xs transition-all duration-150',
  variant === 'selected'
    ? 'border-neutral-300 bg-neutral-50/50 shadow-[inset_2px_0_0_0_hsl(var(--primary))]'
    : 'border-neutral-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.01)]',
  variant === 'focused' && 'border-neutral-300 bg-neutral-50/20',
  isButton && 'hover:border-neutral-300 hover:bg-neutral-50/70 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400/20 focus-visible:ring-offset-1',
  !isButton && 'hover:bg-neutral-50/40',
  className
);

/**
 * Renders a contact row item displaying initials avatar, name, and position/contact info.
 * Provides edit/delete actions that reveal or layout dynamically.
 *
 * @param props - The component properties.
 * @param props.contact - The contact entity record.
 * @param props.variant - The visual variant (default, selected, focused, selectable).
 * @param props.onSelect - Callback triggered when selecting the contact.
 * @param props.buttonRef - Ref for the button element.
 * @param props.actions - Renders action buttons.
 * @param props.className - Extra styles.
 * @param props.emptyDetailLabel - Default label for empty contact details.
 * @returns The rendered JSX element.
 */
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
      <AvatarInitials name={name} size="sm" className="rounded bg-neutral-100 text-neutral-600 font-mono text-[10px] font-bold" />
      <span className="min-w-0">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate font-bold text-neutral-900 leading-none">{name}</span>
          {variant === 'selected' ? (
            <CheckCircle2 size={12} className="shrink-0 text-emerald-600" aria-hidden="true" />
          ) : null}
        </span>
        <span className="block truncate text-[11px] leading-relaxed text-neutral-500 mt-0.5">
          {detail}
        </span>
      </span>
      <span className="flex shrink-0 items-center justify-end gap-1">
        {actions}
        {variant === 'selectable' ? (
          <ChevronRight
            size={13}
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
