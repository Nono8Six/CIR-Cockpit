import { ChevronLeft, ChevronRight, RefreshCcw, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { formatDate } from '@/utils/date/formatDate';
import { formatTime } from '@/utils/date/formatTime';
import type { ClientDetailInteractionsSectionProps } from './ClientDetailPanel.types';

const ClientDetailInteractionsSection = ({
  interactions,
  isInteractionsLoading,
  currentPage,
  totalPages,
  totalInteractions,
  onOpenInteraction,
  onDeleteInteraction,
  onPreviousPage,
  onNextPage,
  onRetry,
  hasError
}: ClientDetailInteractionsSectionProps) => (
  <section className="flex min-h-0 flex-col gap-3">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground/80">Interactions</p>
        <p className="text-sm text-muted-foreground">{totalInteractions} interaction(s)</p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="dense"
          className="h-8 px-2 text-xs"
          onClick={onPreviousPage}
          disabled={currentPage <= 1}
        >
          <ChevronLeft size={14} />
        </Button>
        <span className="text-xs text-muted-foreground">
          Page {currentPage} / {totalPages}
        </span>
        <Button
          type="button"
          variant="outline"
          size="dense"
          className="h-8 px-2 text-xs"
          onClick={onNextPage}
          disabled={currentPage >= totalPages}
        >
          <ChevronRight size={14} />
        </Button>
      </div>
    </div>

    <div className="max-h-[46vh] space-y-2 overflow-y-auto pr-1">
      {isInteractionsLoading ? (
        <div className="text-sm text-muted-foreground/80">Chargement des interactions...</div>
      ) : hasError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <p>Impossible de charger les interactions de ce client.</p>
          <Button type="button" variant="outline" size="dense" className="mt-2 h-8" onClick={onRetry}>
            <RefreshCcw size={14} />
            Reessayer
          </Button>
        </div>
      ) : interactions.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
          Aucune interaction pour ce client.
        </div>
      ) : (
        interactions.map((interaction) => (
          <article key={interaction.id} className="rounded-md border border-border bg-surface-1 p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 space-y-1">
                <p className="truncate text-sm font-semibold text-foreground">{interaction.subject}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {interaction.contact_name || interaction.company_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(interaction.last_action_at)} · {formatTime(interaction.last_action_at)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="dense"
                  className="h-8 text-primary hover:text-primary"
                  onClick={() => onOpenInteraction(interaction)}
                >
                  Ouvrir
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 text-destructive hover:text-destructive"
                  onClick={() => onDeleteInteraction(interaction)}
                  aria-label={`Supprimer ${interaction.subject}`}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          </article>
        ))
      )}
    </div>
  </section>
);

export default ClientDetailInteractionsSection;
