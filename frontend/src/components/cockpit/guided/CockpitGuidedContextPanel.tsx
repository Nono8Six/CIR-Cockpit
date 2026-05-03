import { Building2, CircleAlert, FileText, Hash, Mail, Phone } from 'lucide-react';

import type { Entity, EntityContact, Interaction } from '@/types';
import {
  buildContactName,
  buildEntityLocation,
  compactJoin,
  contextActionClassName,
  formatAccountType,
  getEntityRecordHref,
  renderClientInteraction,
  renderInfoItems
} from './CockpitGuidedContextPanel.helpers';

type CockpitGuidedContextPanelProps = {
  selectedEntity: Entity | null;
  selectedContact: EntityContact | null;
  clientInteractions?: Interaction[];
  totalClientInteractions: number;
  isClientInteractionsLoading: boolean;
  hasClientInteractionsError: boolean;
};

const EMPTY_CLIENT_INTERACTIONS: Interaction[] = [];

const CockpitGuidedContextPanel = ({
  selectedEntity,
  selectedContact,
  clientInteractions = EMPTY_CLIENT_INTERACTIONS,
  totalClientInteractions,
  isClientInteractionsLoading,
  hasClientInteractionsError
}: CockpitGuidedContextPanelProps) => {
  const entityLocation = selectedEntity ? buildEntityLocation(selectedEntity) : '';
  const contactName = selectedContact ? buildContactName(selectedContact) : '';
  const phoneHref = selectedContact?.phone ? `tel:${selectedContact.phone.replace(/[^\d+]/g, '')}` : null;
  const emailHref = selectedContact?.email ? `mailto:${selectedContact.email}` : null;
  const entityRecordHref = getEntityRecordHref(selectedEntity);

  return (
    <aside className="hidden min-h-0 min-w-0 overflow-hidden border-l border-border bg-card/85 xl:block" data-testid="cockpit-guided-context">
      <div className="flex h-full min-h-0 flex-col p-4 pb-5">
      {selectedEntity ? (
        <section className="space-y-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-primary/15 bg-primary/10 text-primary">
              <Building2 size={18} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-foreground">{selectedEntity.name}</p>
              <p className="truncate text-[11px] font-medium text-muted-foreground">
                {compactJoin([selectedEntity.client_number, selectedEntity.entity_type])}
              </p>
            </div>
          </div>
          {renderInfoItems([
            { label: 'Localisation', value: entityLocation },
            { label: 'Compte', value: formatAccountType(selectedEntity.account_type) },
            { label: 'SIREN', value: selectedEntity.siren },
            { label: 'SIRET', value: selectedEntity.siret },
            { label: 'NAF', value: selectedEntity.naf_code },
            { label: 'Pays', value: selectedEntity.country }
          ])}
        </section>
      ) : null}
      <section className="mt-6 flex min-h-0 flex-col space-y-3 border-t border-border pt-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            <Hash size={12} aria-hidden="true" />
            Interactions du client
          </div>
          <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
            {totalClientInteractions}
          </span>
        </div>
        {isClientInteractionsLoading ? (
          <div className="space-y-2" aria-live="polite" aria-label="Chargement des interactions du client">
            <div className="skeleton-shimmer h-9 rounded-md" />
            <div className="skeleton-shimmer h-9 rounded-md" />
            <div className="skeleton-shimmer h-9 rounded-md" />
          </div>
        ) : hasClientInteractionsError ? (
          <div className="flex gap-2 rounded-md border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
            <CircleAlert size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
            <p>Impossible de charger les interactions de ce client.</p>
          </div>
        ) : clientInteractions.length === 0 ? (
          <div className="rounded-md border border-dashed border-border bg-surface-1/45 p-3 text-xs text-muted-foreground">
            Aucune interaction rattachée à ce client.
          </div>
        ) : (
          <div className="min-h-0 space-y-3 overflow-y-auto pr-1">
            {clientInteractions.map(renderClientInteraction)}
          </div>
        )}
      </section>
      <div className="mt-auto grid grid-cols-3 gap-2 border-t border-border pt-3">
        {entityRecordHref ? (
          <a href={entityRecordHref} className={contextActionClassName} aria-label="Fiche complète" title="Fiche complète">
            <FileText size={13} aria-hidden="true" />
          </a>
        ) : (
          <button type="button" disabled className={contextActionClassName} aria-label="Fiche complète" title="Fiche complète">
            <FileText size={13} aria-hidden="true" />
          </button>
        )}
        {phoneHref ? (
          <a href={phoneHref} className={contextActionClassName} aria-label={`Appeler ${contactName}`} title="Appeler">
            <Phone size={13} aria-hidden="true" />
          </a>
        ) : (
          <button type="button" disabled className={contextActionClassName} aria-label="Téléphone" title="Téléphone">
            <Phone size={13} aria-hidden="true" />
          </button>
        )}
        {emailHref ? (
          <a href={emailHref} className={contextActionClassName} aria-label={`Envoyer un email à ${contactName}`} title="Email">
            <Mail size={13} aria-hidden="true" />
          </a>
        ) : (
          <button type="button" disabled className={contextActionClassName} aria-label="Email" title="Email">
            <Mail size={13} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  </aside>
  );
};

export default CockpitGuidedContextPanel;
