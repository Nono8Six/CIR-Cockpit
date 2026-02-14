import { Mail, Phone, UserRound } from 'lucide-react';

import type { Interaction } from '@/types';

type InteractionCardBodyProps = {
  data: Interaction;
};

const InteractionCardBody = ({ data }: InteractionCardBodyProps) => (
  <div className="space-y-1.5">
    <p className="line-clamp-2 text-sm font-medium leading-snug text-slate-800">
      {data.subject}
    </p>
    <p className="flex min-w-0 items-center gap-1.5 text-xs text-slate-600">
      <UserRound size={12} className="shrink-0 text-slate-400" aria-hidden="true" />
      <span className="truncate">{data.contact_name}</span>
    </p>
    {(data.contact_phone || data.contact_email) && (
      <p className="flex min-w-0 items-center gap-1.5 text-xs text-slate-500">
        {data.contact_phone ? (
          <Phone size={12} className="shrink-0 text-slate-400" aria-hidden="true" />
        ) : (
          <Mail size={12} className="shrink-0 text-slate-400" aria-hidden="true" />
        )}
        <span className="truncate">{data.contact_phone ?? data.contact_email}</span>
      </p>
    )}
  </div>
);

export default InteractionCardBody;
