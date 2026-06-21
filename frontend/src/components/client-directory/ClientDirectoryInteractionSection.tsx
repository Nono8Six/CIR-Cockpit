import { RefreshCcw, Trash2, Phone, Mail, Layers, MapPin } from 'lucide-react';

import { Badge } from '../ui/data-display/Badge';
import { Button } from '../ui/inputs/basic/Button';
import { Skeleton } from '../ui/feedback/Skeleton';
import { formatRelativeTime } from '@/utils/date/formatRelativeTime';
import type { Interaction } from '@/types';
import { cn } from '@/lib/utils';

export type InteractionListState = {
  currentPage: number;
  hasError: boolean;
  interactions: Interaction[];
  isLoading: boolean;
  isRefreshing: boolean;
  onNextPage: () => void;
  onPreviousPage: () => void;
  onRetry: () => void;
  totalInteractions: number;
  totalPages: number;
  visibleInteractions: number;
};

export interface ClientDirectoryInteractionSectionProps {
  emptyLabel: string;
  list: InteractionListState;
  onDeleteInteraction: (interaction: Interaction) => void;
  onOpenInteraction: (interaction: Interaction) => void;
}

const toneClassNames = {
  closed: 'border-emerald-200 bg-emerald-50/50 text-emerald-700 font-semibold',
  open: 'border-amber-200 bg-amber-50/50 text-amber-700 font-semibold'
};

/**
 * Renders individual rows in the interactions timeline.
 * Each interaction is a node along a vertical border-l line.
 * Hovering reveals actions for opening or deleting the interaction.
 *
 * @param props - The component properties.
 * @param props.interactions - Array of interactions to display.
 * @param props.onDeleteInteraction - Callback to delete an interaction.
 * @param props.onOpenInteraction - Callback to open/view an interaction.
 * @returns The rendered JSX element.
 */
/**
 * Resolves the appropriate icon component for an interaction channel.
 *
 * @param channel - The name of the interaction channel.
 * @returns A Lucide icon component.
 */
const getChannelIcon = (channel: string) => {
  switch (channel) {
    case 'Téléphone':
      return Phone;
    case 'Email':
      return Mail;
    case 'Comptoir':
      return Layers;
    case 'Visite':
      return MapPin;
    default:
      return Layers;
  }
};

/**
 * Renders individual rows in the interactions timeline.
 * Each interaction is a node along a vertical border-l line.
 * Hovering reveals actions for opening or deleting the interaction.
 *
 * @param props - The component properties.
 * @param props.interactions - Array of interactions to display.
 * @param props.onDeleteInteraction - Callback to delete an interaction.
 * @param props.onOpenInteraction - Callback to open/view an interaction.
 * @returns The rendered JSX element.
 */
const ClientDirectoryInteractionRows = ({
  interactions,
  onDeleteInteraction,
  onOpenInteraction
}: Pick<ClientDirectoryInteractionSectionProps, 'onDeleteInteraction' | 'onOpenInteraction'> & {
  interactions: Interaction[];
}) => (
  <div className="relative ml-4 border-l border-neutral-200/80 pl-8 space-y-6 py-2">
    {interactions.map((interaction) => {
      const isClosed = interaction.status_is_terminal;
      const ChannelIcon = getChannelIcon(interaction.channel);
      const latestEvent = [...interaction.timeline]
        .reverse()
        .find((event) => event.type === 'note' || event.type === 'creation');

      return (
        <article key={interaction.id} className="relative group">
          {/* Timeline Node Icon (Neutral & Pixel-Perfect) */}
          <div className="absolute -left-[44px] top-2.5 flex size-6 items-center justify-center rounded-full bg-white border border-neutral-200 shadow-sm text-neutral-400 group-hover:text-neutral-600 group-hover:border-neutral-300 transition-all duration-150">
            <ChannelIcon size={11} strokeWidth={1.5} />
          </div>

          {/* Card Box Wrapper */}
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between bg-white border border-neutral-200 rounded-md p-4 transition-all duration-150 shadow-sm hover:border-neutral-300 hover:shadow-soft">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-[10px] font-mono text-neutral-500 font-medium">
                  {formatRelativeTime(interaction.last_action_at)}
                </span>
                <span className="size-1 rounded-full bg-neutral-300" />
                <h4 className="text-sm font-bold text-neutral-900 leading-snug">
                  {interaction.subject || 'Sans sujet'}
                </h4>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold tracking-wide border",
                    toneClassNames[isClosed ? 'closed' : 'open']
                  )}
                >
                  {interaction.status || 'Sans statut'}
                </Badge>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-neutral-500 font-medium">
                <span>Canal : {interaction.channel}</span>
                {interaction.contact_name && (
                  <>
                    <span className="text-neutral-300">·</span>
                    <span className="font-bold text-neutral-700">{interaction.contact_name}</span>
                  </>
                )}
                {interaction.contact_service && (
                  <>
                    <span className="text-neutral-300">·</span>
                    <span className="font-semibold text-neutral-600">{interaction.contact_service}</span>
                  </>
                )}
              </div>

              {/* Latest Timeline Event Note Preview */}
              {latestEvent?.content && (
                <div className="mt-2 text-xs text-neutral-700 bg-neutral-50/50 border border-neutral-200/80 rounded-md p-3 leading-relaxed whitespace-pre-wrap font-sans font-medium">
                  {latestEvent.content}
                </div>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-1 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-150">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 px-2.5 text-xs border-neutral-200 hover:bg-neutral-50 text-neutral-700 shadow-sm rounded-md font-semibold transition-all"
                aria-label={`Ouvrir ${interaction.subject || 'cette interaction'}`}
                onClick={() => onOpenInteraction(interaction)}
              >
                Ouvrir
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-neutral-400 hover:text-red-600 hover:bg-red-50/50 rounded-md transition-all"
                aria-label={`Supprimer ${interaction.subject || 'cette interaction'}`}
                onClick={() => onDeleteInteraction(interaction)}
              >
                <Trash2 size={13} strokeWidth={1.5} />
              </Button>
            </div>
          </div>
        </article>
      );
    })}
  </div>
);

/**
 * Renders the wrapper section for the interactions timeline.
 * Handles the display of loading skeletons, error warnings, empty states, and actual rows.
 *
 * @param props - The component properties.
 * @param props.emptyLabel - The text label to display when there are no interactions.
 * @param props.list - The list state including loading and error values.
 * @param props.onDeleteInteraction - Callback to delete an interaction.
 * @param props.onOpenInteraction - Callback to open/view an interaction.
 * @returns The rendered JSX element.
 */
const ClientDirectoryInteractionSection = ({
  emptyLabel,
  list,
  onDeleteInteraction,
  onOpenInteraction
}: ClientDirectoryInteractionSectionProps) => {
  if (list.isLoading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-14 rounded-lg border border-neutral-100/50" />
        <Skeleton className="h-14 rounded-lg border border-neutral-100/50" />
      </div>
    );
  }

  if (list.hasError) {
    return (
      <div className="rounded-lg border border-destructive/25 bg-destructive/[0.02] p-4 text-xs text-destructive flex items-center justify-between gap-4">
        <span>Impossible de charger les interactions. Vous pouvez réessayer.</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 px-2.5 text-xs border-destructive/20 hover:bg-destructive/5"
          onClick={list.onRetry}
        >
          <RefreshCcw size={12} strokeWidth={1.5} className="mr-1" />
          Réessayer
        </Button>
      </div>
    );
  }

  if (list.interactions.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50/30 px-4 py-8 text-center text-xs text-muted-foreground/80">
        {emptyLabel}
      </div>
    );
  }

  return (
    <ClientDirectoryInteractionRows
      interactions={list.interactions}
      onDeleteInteraction={onDeleteInteraction}
      onOpenInteraction={onOpenInteraction}
    />
  );
};

export default ClientDirectoryInteractionSection;

