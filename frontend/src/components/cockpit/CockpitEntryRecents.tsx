import { useCallback, useRef, useState, type KeyboardEvent } from 'react';
import { History, type LucideIcon, Mail, Phone, Store, Car } from 'lucide-react';

import { formatRelativeTime } from '@/utils/date/formatRelativeTime';
import { Channel, type Entity, type Interaction } from '@/types';

type CockpitEntryRecentsProps = {
  interactions: Interaction[];
  entities: Entity[];
  onSelectRecent: (interaction: Interaction, entity: Entity | null) => void;
};

const CHANNEL_ICON: Record<Channel, LucideIcon> = {
  [Channel.PHONE]: Phone,
  [Channel.EMAIL]: Mail,
  [Channel.COUNTER]: Store,
  [Channel.VISIT]: Car
};

const CHANNEL_LABEL: Record<Channel, string> = {
  [Channel.PHONE]: 'téléphone',
  [Channel.EMAIL]: 'email',
  [Channel.COUNTER]: 'comptoir',
  [Channel.VISIT]: 'visite'
};

const resolveRecentTitle = (interaction: Interaction): string => {
  const company = interaction.company_name?.trim();
  if (company) return company;
  const contact = interaction.contact_name?.trim();
  return contact || 'Tiers sans nom';
};

const resolveRecentSubject = (interaction: Interaction): string => {
  const subject = interaction.subject?.trim();
  if (subject) return subject;
  return interaction.interaction_type?.trim() || 'Sans objet';
};

const CockpitEntryRecents = ({
  interactions,
  entities,
  onSelectRecent
}: CockpitEntryRecentsProps) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const focusItem = useCallback((index: number) => {
    const target = itemRefs.current[index];
    if (target) {
      setActiveIndex(index);
      target.focus();
    }
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
      const count = interactions.length;
      if (count === 0) return;

      switch (event.key) {
        case 'ArrowDown': {
          event.preventDefault();
          focusItem((index + 1) % count);
          break;
        }
        case 'ArrowUp': {
          event.preventDefault();
          focusItem((index - 1 + count) % count);
          break;
        }
        case 'Home': {
          event.preventDefault();
          focusItem(0);
          break;
        }
        case 'End': {
          event.preventDefault();
          focusItem(count - 1);
          break;
        }
        default:
          break;
      }
    },
    [focusItem, interactions.length]
  );

  if (interactions.length === 0) return null;

  const entityById = new Map(entities.map((entity) => [entity.id, entity]));
  const safeActiveIndex = Math.min(activeIndex, interactions.length - 1);

  return (
    <section
      data-testid="cockpit-entry-recents"
      aria-label="Dernières saisies"
      className="flex min-w-0 flex-col gap-2 rounded-lg border border-border/70 bg-card/70 px-3 py-2.5 sm:px-4"
    >
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        <History size={11} aria-hidden />
        Dernières saisies
      </div>
      <ul className="flex flex-col gap-1">
        {interactions.map((interaction, index) => {
          const ChannelIcon = CHANNEL_ICON[interaction.channel] ?? Phone;
          const channelLabel = CHANNEL_LABEL[interaction.channel] ?? 'interaction';
          const title = resolveRecentTitle(interaction);
          const subject = resolveRecentSubject(interaction);
          const relative = interaction.created_at
            ? formatRelativeTime(interaction.created_at)
            : '';
          const entity = interaction.entity_id
            ? entityById.get(interaction.entity_id) ?? null
            : null;
          const isActive = index === safeActiveIndex;

          return (
            <li key={interaction.id}>
              <button
                ref={(node) => {
                  itemRefs.current[index] = node;
                }}
                type="button"
                data-testid="cockpit-entry-recent-item"
                tabIndex={isActive ? 0 : -1}
                onClick={() => {
                  setActiveIndex(index);
                  onSelectRecent(interaction, entity);
                }}
                onFocus={() => setActiveIndex(index)}
                onKeyDown={(event) => handleKeyDown(event, index)}
                className="group flex min-w-0 w-full items-center gap-2 rounded-md border border-transparent bg-transparent px-2 py-1.5 text-left transition-colors hover:border-border hover:bg-muted/50 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                aria-label={`Rouvrir une saisie ${channelLabel} avec ${title}, sujet ${subject}`}
              >
                <ChannelIcon
                  size={13}
                  className="shrink-0 text-muted-foreground group-hover:text-foreground"
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">
                  {title}
                </span>
                <span className="hidden min-w-0 max-w-[40%] truncate text-[11px] text-muted-foreground sm:inline">
                  {subject}
                </span>
                {relative ? (
                  <span className="shrink-0 text-[10px] font-medium text-muted-foreground/80">
                    {relative}
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default CockpitEntryRecents;
