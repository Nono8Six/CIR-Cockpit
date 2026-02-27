import { FileText } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import type { Interaction } from '@/types';

type InteractionDetailsSubjectCardProps = {
  interaction: Interaction;
};

const InteractionDetailsSubjectCard = ({ interaction }: InteractionDetailsSubjectCardProps) => (
  <section className="mb-5 rounded-lg border border-border bg-surface-1 p-4">
    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sujet initial</p>
    <p className="mt-1 text-base font-medium leading-snug text-foreground">{interaction.subject}</p>
    {interaction.order_ref && (
      <Badge
        variant="outline"
        className="mt-3 inline-flex w-fit items-center gap-1 border-border bg-card px-2 py-0.5 font-mono text-[11px] text-foreground"
      >
        <FileText size={12} aria-hidden="true" />
        #{interaction.order_ref}
      </Badge>
    )}
  </section>
);

export default InteractionDetailsSubjectCard;
