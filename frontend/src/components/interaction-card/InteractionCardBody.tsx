import { UserRound } from 'lucide-react';

import type { Interaction } from '@/types';

type InteractionCardBodyProps = {
  data: Interaction;
};

/**
 * Body content of the InteractionCard.
 * Displays the subject/description and the contact person's name (only if provided).
 * 
 * @param {InteractionCardBodyProps} props - The component props.
 * @returns {React.JSX.Element} The rendered card body.
 */
const InteractionCardBody = ({ data }: InteractionCardBodyProps) => (
  <div className="space-y-2 py-0.5">
    <p className="line-clamp-2 text-[13px] font-semibold leading-relaxed text-foreground/90 group-hover:text-primary transition-colors duration-200">
      {data.subject || "Sans sujet"}
    </p>
    {data.contact_name?.trim() && (
      <p className="flex min-w-0 items-center gap-1 font-mono text-[9.5px] font-bold text-muted-foreground/70 select-none">
        <UserRound size={11} className="shrink-0 opacity-60" aria-hidden="true" />
        <span className="truncate">{data.contact_name}</span>
      </p>
    )}
  </div>
);

export default InteractionCardBody;
