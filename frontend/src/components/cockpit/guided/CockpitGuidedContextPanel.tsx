import { Building2, CircleAlert, FileText, Hash, Mail, Phone } from 'lucide-react';

import type { Entity, EntityContact, Interaction } from '@/types';
import { TooltipProvider } from '../../ui/feedback/Tooltip';
import {
  buildContactName,
  buildEntityLocation,
  compactJoin,
  formatAccountType,
  getEntityRecordHref,
  renderClientInteraction,
  renderContextAction,
  renderInfoItems
} from './cockpit-guided-context-panel-helpers';

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
    <TooltipProvider delayDuration={300}>
      {/* Le rail se cale sur sa hauteur de contenu: il ne laisse pas de colonne vide. */}
      <aside className="hidden min-h-0 min-w-0 self-start p-3 xl:block" data-testid="cockpit-guided-context">
        <div className="flex max-h-full min-h-0 flex-col rounded-lg border border-border bg-card p-4">
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
          {/* Les actions restent collees a la fiche: rien ne les pousse en bas de colonne. */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            {renderContextAction({
              icon: FileText,
              label: 'Fiche',
              href: entityRecordHref,
              availableTooltip: 'Ouvrir la fiche complète du tiers',
              unavailableTooltip: 'Aucune fiche disponible pour ce tiers'
            })}
            {renderContextAction({
              icon: Phone,
              label: 'Appeler',
              href: phoneHref,
              availableTooltip: contactName ? `Appeler ${contactName}` : 'Appeler le contact',
              unavailableTooltip: 'Aucun numéro renseigné pour ce contact'
            })}
            {renderContextAction({
              icon: Mail,
              label: 'Écrire',
              href: emailHref,
              availableTooltip: contactName ? `Envoyer un email à ${contactName}` : 'Envoyer un email',
              unavailableTooltip: 'Aucun email renseigné pour ce contact'
            })}
          </div>
          <section className="mt-5 flex min-h-0 flex-1 flex-col space-y-3 border-t border-border pt-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <Hash size={12} aria-hidden="true" />
                Interactions du client
              </div>
              <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
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
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
                {clientInteractions.map(renderClientInteraction)}
              </div>
            )}
          </section>
        </div>
      </aside>
    </TooltipProvider>
  );
};

export default CockpitGuidedContextPanel;
