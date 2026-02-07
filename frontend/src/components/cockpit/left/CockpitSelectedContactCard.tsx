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
    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 flex items-start justify-between gap-3">
      <div className="flex items-start gap-2 min-w-0">
        <div className="w-8 h-8 rounded-md bg-white border border-slate-200 flex items-center justify-center text-slate-500">
          <User size={16} />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-slate-900 truncate">
            {(contact.first_name ?? '').trim()} {contact.last_name}
          </p>
          <p className="text-[11px] text-slate-500 truncate">
            {contactMeta || 'Aucune information'}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onClear}
        className="text-[11px] font-semibold text-slate-500 hover:text-slate-700"
      >
        Changer
      </button>
    </div>
  );
};

export default CockpitSelectedContactCard;
