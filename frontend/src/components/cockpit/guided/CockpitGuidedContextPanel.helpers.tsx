import { Mail, MapPin, PhoneCall, Store } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import type { Entity, EntityContact, Interaction } from '@/types';
import { cn } from '@/lib/utils';
import { formatDate } from '@/utils/date/formatDate';

type InfoItem = {
  label: string;
  value: string | null | undefined;
};

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  term: 'Compte à terme'
};

const getInteractionIcon = (channel: Interaction['channel']): {
  icon: LucideIcon;
  className: string;
} => {
  if (channel === 'Email') return { icon: Mail, className: 'bg-primary/10 text-primary' };
  if (channel === 'Comptoir') return { icon: Store, className: 'bg-warning/15 text-warning-foreground' };
  if (channel === 'Visite') return { icon: MapPin, className: 'bg-success/12 text-success' };
  return { icon: PhoneCall, className: 'bg-blue-100 text-blue-700' };
};

export const compactJoin = (values: Array<string | null | undefined>, separator = ' - '): string =>
  values.map((value) => value?.trim()).filter(Boolean).join(separator);

export const buildEntityLocation = (entity: Entity): string =>
  compactJoin([entity.postal_code, entity.city], ' ') || entity.city || entity.department || '';

export const formatAccountType = (accountType: string | null | undefined): string | null => {
  const normalizedAccountType = accountType?.trim().toLowerCase();
  if (!normalizedAccountType) return null;
  return ACCOUNT_TYPE_LABELS[normalizedAccountType] ?? accountType?.trim() ?? null;
};

export const buildContactName = (contact: EntityContact): string =>
  compactJoin([contact.first_name, contact.last_name], ' ') || contact.last_name;

export const getEntityRecordHref = (entity: Entity | null): string | null => {
  if (!entity) return null;
  if (entity.entity_type === 'Prospect') return `/clients/prospects/${entity.id}`;
  if (entity.client_number) return `/clients/${encodeURIComponent(entity.client_number)}`;
  return null;
};

export const renderInfoItems = (items: InfoItem[]) => {
  const visibleItems = items.filter((item) => item.value?.trim());
  if (visibleItems.length === 0) return null;

  return (
    <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
      {visibleItems.map((item) => (
        <div key={item.label} className="min-w-0 border-t border-[hsl(var(--border-subtle))] pt-2">
          <dt className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">
            {item.label}
          </dt>
          <dd className="mt-0.5 truncate text-[11px] font-medium text-foreground">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
};

export const renderClientInteraction = (interaction: Interaction) => {
  const interactionIcon = getInteractionIcon(interaction.channel);
  const InteractionIcon = interactionIcon.icon;

  return (
    <div key={interaction.id} className="flex min-w-0 gap-2.5">
      <span
        className={cn(
          'mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px]',
          interactionIcon.className
        )}
        aria-hidden="true"
      >
        <InteractionIcon size={12} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-foreground">{interaction.subject}</p>
        <p className="truncate font-mono text-[10.5px] text-muted-foreground">
          {interaction.contact_name || interaction.interaction_type || interaction.channel} - {formatDate(interaction.last_action_at)}
        </p>
      </div>
    </div>
  );
};

export const contextActionClassName = 'inline-flex h-9 min-w-0 items-center justify-center rounded-md border border-border bg-background px-0 text-foreground transition-[color,background-color,border-color,box-shadow,transform] hover:border-primary/35 hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-px disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-border disabled:hover:bg-background';
