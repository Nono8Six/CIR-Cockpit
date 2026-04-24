import { Building2, Clock3, UserRound } from 'lucide-react';

import type { Entity, EntityContact, Interaction } from '@/types';
import { formatDate } from '@/utils/date/formatDate';

type CockpitGuidedContextPanelProps = {
  selectedEntity: Entity | null;
  selectedEntityMeta: string;
  selectedContact: EntityContact | null;
  selectedContactMeta: string;
  recentOwnInteractions: Interaction[];
};

const CockpitGuidedContextPanel = ({
  selectedEntity,
  selectedEntityMeta,
  selectedContact,
  selectedContactMeta,
  recentOwnInteractions
}: CockpitGuidedContextPanelProps) => (
  <aside className="hidden min-w-0 border-l border-border bg-card/80 xl:block" data-testid="cockpit-guided-context">
    <div className="sticky top-0 space-y-5 p-4">
      {selectedEntity ? (
        <section className="space-y-2">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Building2 size={17} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{selectedEntity.name}</p>
              <p className="truncate text-xs text-muted-foreground">{selectedEntityMeta || selectedEntity.entity_type}</p>
            </div>
          </div>
        </section>
      ) : null}
      {selectedContact ? (
        <section className="space-y-2">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-1 text-muted-foreground">
              <UserRound size={17} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {[selectedContact.first_name ?? '', selectedContact.last_name].filter(Boolean).join(' ')}
              </p>
              <p className="truncate text-xs text-muted-foreground">{selectedContactMeta || selectedContact.email || selectedContact.phone}</p>
            </div>
          </div>
        </section>
      ) : null}
      {recentOwnInteractions.length ? (
        <section className="space-y-2">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            <Clock3 size={13} aria-hidden="true" />
            Interactions recentes
          </div>
          <div className="space-y-2">
            {recentOwnInteractions.slice(0, 4).map((interaction) => (
              <div key={interaction.id} className="rounded-md border border-border bg-surface-1/70 px-3 py-2">
                <p className="truncate text-xs font-semibold text-foreground">{interaction.subject}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {interaction.company_name || interaction.contact_name || interaction.entity_type} - {formatDate(interaction.last_action_at)}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  </aside>
);

export default CockpitGuidedContextPanel;
