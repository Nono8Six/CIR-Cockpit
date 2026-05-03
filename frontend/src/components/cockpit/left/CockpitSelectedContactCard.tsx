import { CheckCircle2, RotateCcw } from 'lucide-react';

import AvatarInitials from '@/components/ui/avatar-initials';
import type { EntityContact } from '@/types';

type CockpitSelectedContactCardProps = {
  contact: EntityContact;
  onClear: () => void;
};

const buildFullName = (contact: EntityContact): string =>
  [contact.first_name ?? '', contact.last_name ?? ''].filter(Boolean).join(' ').trim() || 'Contact';

const CockpitSelectedContactCard = ({
  contact,
  onClear
}: CockpitSelectedContactCardProps) => {
  const fullName = buildFullName(contact);
  const position = contact.position?.trim() ?? '';
  const tertiary = (contact.email?.trim() || contact.phone?.trim()) ?? '';

  return (
    <div className="flex items-center gap-3 rounded-md border border-primary/35 bg-card px-3 py-2.5 shadow-[inset_3px_0_0_0_hsl(var(--primary))]">
      <AvatarInitials name={fullName} size="md" className="rounded-md" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-semibold text-foreground">{fullName}</p>
          <CheckCircle2 size={13} className="shrink-0 text-primary" aria-hidden="true" />
        </div>
        {position ? (
          <p className="truncate text-xs text-muted-foreground">{position}</p>
        ) : null}
        {tertiary ? (
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground/85">{tertiary}</p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onClear}
        className="inline-flex shrink-0 items-center gap-1 rounded-md border border-transparent px-2 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-border hover:bg-surface-1 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <RotateCcw size={12} aria-hidden="true" />
        Changer
      </button>
    </div>
  );
};

export default CockpitSelectedContactCard;
