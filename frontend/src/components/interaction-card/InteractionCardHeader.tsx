import { MoreVertical, Trash2, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Interaction, StatusCategory } from '@/types';
import { formatDate } from '@/utils/date/formatDate';
import { formatTime } from '@/utils/date/formatTime';
import { getInteractionChannelIcon } from './InteractionChannelIcon';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from '@/components/ui/navigation/DropdownMenu';

type InteractionCardHeaderProps = {
  data: Interaction;
  statusTone?: StatusCategory;
  onDeleteInteraction?: (interaction: Interaction) => void;
  onSelectInteraction?: (interaction: Interaction) => void;
};

/**
 * Header section of the InteractionCard.
 * Displays channel icon, company name (or fallback placeholder), status dot, date/time,
 * and a three-dot menu button to trigger deletion.
 * 
 * @param {InteractionCardHeaderProps} props - The component props.
 * @returns {React.JSX.Element} The rendered card header.
 */
const InteractionCardHeader = ({ data, statusTone, onDeleteInteraction, onSelectInteraction }: InteractionCardHeaderProps) => {
  const statusDotClass =
    statusTone === 'done'
      ? 'bg-success'
      : statusTone === 'todo'
        ? 'bg-destructive'
        : 'bg-warning';

  const companyName = data.company_name?.trim() || "Sans entreprise";
  const isPlaceholder = !data.company_name?.trim();
  const lastActionDate = formatDate(data.last_action_at);
  const lastActionTime = formatTime(data.last_action_at);

  return (
    <div className="mb-3.5 flex items-center justify-between gap-2.5 select-none">
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/80 bg-muted/30 text-muted-foreground shadow-soft">
          {getInteractionChannelIcon(data.channel)}
        </span>
        <span
          className={cn(
            'truncate text-[13px] tracking-tight',
            isPlaceholder
              ? 'italic font-semibold text-muted-foreground'
              : 'font-semibold text-foreground'
          )}
          title={companyName}
        >
          {companyName}
        </span>
        {statusTone && (
          <span className={`size-1.5 shrink-0 rounded-full ${statusDotClass}`} aria-hidden="true" />
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <time
          dateTime={data.last_action_at}
          title="Dernière action enregistrée"
          className="inline-flex items-center gap-1 rounded-md border border-border/80 bg-muted/45 px-2 py-1 font-mono text-[11px] font-bold leading-none text-foreground shadow-soft tabular-nums"
        >
          <span className="hidden font-sans text-[10px] font-semibold uppercase tracking-normal text-muted-foreground sm:inline">
            Dernière action
          </span>
          <span>{lastActionDate}</span>
          <span className="font-sans text-muted-foreground/70">•</span>
          <span>{lastActionTime}</span>
        </time>
        {onDeleteInteraction && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground/50 hover:bg-muted/70 hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                onClick={(event) => {
                  event.stopPropagation();
                }}
                aria-label={`Actions pour ${data.company_name}`}
              >
                <MoreVertical size={15} aria-hidden="true" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {onSelectInteraction && (
                <DropdownMenuItem
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelectInteraction(data);
                  }}
                >
                  <FolderOpen size={14} className="mr-2 text-muted-foreground" />
                  <span>Ouvrir le dossier</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                onClick={(event) => {
                  event.stopPropagation();
                  onDeleteInteraction(data);
                }}
              >
                <Trash2 size={14} className="mr-2" />
                <span>Supprimer</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
};

export default InteractionCardHeader;
