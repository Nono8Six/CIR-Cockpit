import { UserRound, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Interaction } from '@/types';

type InteractionDetailsHeaderProps = {
  interaction: Interaction;
  canConvert: boolean;
  onRequestConvert: (interaction: Interaction) => void;
  onClose: () => void;
};

const InteractionDetailsHeader = ({
  interaction,
  canConvert,
  onRequestConvert,
  onClose
}: InteractionDetailsHeaderProps) => (
  <header className="shrink-0 border-b border-border bg-surface-1 px-4 py-3 sm:px-5">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 space-y-1">
        <h2 className="truncate text-base font-semibold text-foreground sm:text-lg">
          {interaction.company_name}
        </h2>
        <p className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
          <UserRound size={14} className="shrink-0 text-muted-foreground/80" aria-hidden="true" />
          <span className="truncate">{interaction.contact_name}</span>
        </p>
        {(interaction.contact_phone || interaction.contact_email) && (
          <p className="truncate text-xs font-medium text-muted-foreground">
            {interaction.contact_phone ?? interaction.contact_email}
          </p>
        )}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-8 text-muted-foreground hover:text-foreground"
        onClick={onClose}
        aria-label="Fermer le panneau"
      >
        <X size={16} />
      </Button>
    </div>
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <Badge
        variant="outline"
        className="border-border bg-card px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground"
      >
        {interaction.entity_type}
      </Badge>
      <Badge
        variant="outline"
        className="border-warning/35 bg-warning/15 px-2 py-0.5 text-[10px] uppercase tracking-wide text-warning-foreground"
      >
        {interaction.interaction_type}
      </Badge>
      <Badge
        variant="outline"
        className="border-border bg-card px-2 py-0.5 text-[10px] text-muted-foreground"
      >
        {interaction.contact_service}
      </Badge>
      {canConvert && (
        <Button
          type="button"
          variant="outline"
          size="dense"
          onClick={() => onRequestConvert(interaction)}
          className="h-7 border-ring/30 text-[11px] text-primary hover:bg-primary/10 hover:text-primary"
        >
          Convertir en client
        </Button>
      )}
    </div>
  </header>
);

export default InteractionDetailsHeader;
