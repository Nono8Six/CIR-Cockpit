import { UserRound } from 'lucide-react';

import type { Interaction } from '@/types';

type InteractionCardBodyProps = {
  data: Interaction;
};

const InteractionCardBody = ({ data }: InteractionCardBodyProps) => (
  <div className="space-y-1">
    <p className="line-clamp-2 text-xs font-medium leading-snug text-foreground/85">
      {data.subject}
    </p>
    <p className="flex min-w-0 items-center gap-1 font-mono text-[9.5px] text-muted-foreground/70">
      <UserRound size={11} className="shrink-0 opacity-70" aria-hidden="true" />
      <span className="truncate">{data.contact_name}</span>
    </p>
  </div>
);

export default InteractionCardBody;
