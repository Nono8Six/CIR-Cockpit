import { User } from 'lucide-react';

import type { EntityContact } from '@/types';

type CockpitSelectedContactCardProps = {
  contact: EntityContact;
  contactMeta: string;
  onClear: () => void;
};

const CockpitSelectedContactCard = ({
  contact,
  contactMeta,
  onClear
}: CockpitSelectedContactCardProps) => {
  return (
    <div className="rounded-lg border border-border bg-surface-1/80 p-3 flex items-start justify-between gap-3">
      <div className="flex items-start gap-2 min-w-0">
        <div className="w-8 h-8 rounded-md bg-card border border-border flex items-center justify-center text-muted-foreground">
          <User size={16} />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-foreground truncate">
            {(contact.first_name ?? '').trim()} {contact.last_name}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {contactMeta || 'Aucune information'}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onClear}
        className="text-xs font-semibold text-muted-foreground hover:text-foreground"
      >
        Changer
      </button>
    </div>
  );
};

export default CockpitSelectedContactCard;
