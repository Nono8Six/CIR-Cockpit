import { useEffect, useRef } from 'react';
import { Bell, Car, CheckCircle2, Clock, FileText, Mail, Phone, Store, Tag, User } from 'lucide-react';

import { getPlatformShortcutLabel } from '@/app/appConstants';
import { Button } from '@/components/ui/button';
import type { AgencyConfig } from '@/services/config';
import { Channel, type InteractionDraft } from '@/types';

type CockpitReadonlyViewProps = {
  interaction: InteractionDraft;
  config: AgencyConfig;
  onStartNew: () => void;
};

const CHANNEL_ICON = {
  [Channel.PHONE]: Phone,
  [Channel.EMAIL]: Mail,
  [Channel.COUNTER]: Store,
  [Channel.VISIT]: Car
} as const;

const formatReminder = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
};

const resolveStatusLabel = (statusId: string | null | undefined, config: AgencyConfig): string => {
  if (!statusId) return '';
  const match = config.statuses.find((status) => (status.id ?? status.label) === statusId);
  return match?.label ?? statusId;
};

const joinContactName = (interaction: InteractionDraft): string => {
  if (interaction.contact_name?.trim()) return interaction.contact_name.trim();
  const parts = [interaction.contact_first_name, interaction.contact_last_name]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));
  return parts.join(' ');
};

const AtomField = ({
  label,
  value,
  icon: Icon
}: {
  label: string;
  value: string;
  icon?: React.ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean }>;
}) => (
  <div className="flex min-w-0 flex-col gap-0.5 rounded-md border border-border bg-muted/30 px-3 py-2">
    <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
    <span className="flex min-w-0 items-center gap-1.5 truncate text-xs font-semibold text-foreground">
      {Icon ? <Icon size={12} className="shrink-0 text-muted-foreground" aria-hidden /> : null}
      <span className="truncate">{value}</span>
    </span>
  </div>
);

const CockpitReadonlyView = ({ interaction, config, onStartNew }: CockpitReadonlyViewProps) => {
  const newEntryButtonRef = useRef<HTMLButtonElement | null>(null);
  const newEntryShortcut = getPlatformShortcutLabel('N');

  useEffect(() => {
    newEntryButtonRef.current?.focus();
  }, []);

  const ChannelIcon = CHANNEL_ICON[interaction.channel as Channel] ?? Phone;
  const reminderLabel = formatReminder(interaction.reminder_at);
  const statusLabel = resolveStatusLabel(interaction.status_id, config);
  const contactLabel = joinContactName(interaction);
  const tags = interaction.mega_families ?? [];

  return (
    <div
      data-testid="cockpit-readonly-view"
      aria-live="polite"
      className="flex min-w-0 flex-1 flex-col gap-4 bg-surface-1/30 p-4 sm:p-6"
    >
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-success/30 bg-success/5 px-3 py-2 text-sm font-semibold text-success">
        <CheckCircle2 size={16} aria-hidden />
        <span>Interaction enregistrée</span>
        <span className="text-xs font-normal text-muted-foreground">
          Vos champs sont verrouillés. Reprenez avec une nouvelle saisie quand vous êtes prêt.
        </span>
      </div>

      <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-4">
        <AtomField label="Canal" value={String(interaction.channel)} icon={ChannelIcon} />
        <AtomField label="Type de tiers" value={interaction.entity_type || '—'} />
        <AtomField
          label="Société"
          value={interaction.company_name?.trim() || '—'}
        />
        <AtomField
          label="Contact"
          value={contactLabel || '—'}
          icon={contactLabel ? User : undefined}
        />
        <AtomField label="Service" value={interaction.contact_service || '—'} />
        <AtomField label="Type" value={interaction.interaction_type || '—'} />
        <AtomField label="Statut" value={statusLabel || '—'} />
        <AtomField
          label="Rappel"
          value={reminderLabel ?? '—'}
          icon={reminderLabel ? Bell : undefined}
        />
      </div>

      <div
        data-testid="cockpit-readonly-subject"
        className="flex min-w-0 flex-col gap-1 rounded-md border border-border bg-card px-4 py-3"
      >
        <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Sujet</span>
        <p className="text-sm font-semibold text-foreground">
          {interaction.subject?.trim() || <span className="italic text-muted-foreground">Aucun sujet saisi</span>}
        </p>
      </div>

      {interaction.notes?.trim() ? (
        <div
          data-testid="cockpit-readonly-notes"
          className="flex min-w-0 flex-col gap-1 rounded-md border border-border bg-card px-4 py-3"
        >
          <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            <FileText size={11} aria-hidden />
            Notes
          </span>
          <p className="whitespace-pre-wrap text-xs text-foreground">{interaction.notes.trim()}</p>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-wrap gap-3 text-xs text-muted-foreground">
        {interaction.order_ref?.trim() ? (
          <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/50 px-2 py-1 font-mono">
            <Clock size={11} aria-hidden />
            Ref. {interaction.order_ref.trim()}
          </span>
        ) : null}
        {tags.length > 0 ? (
          <div data-testid="cockpit-readonly-tags" className="flex flex-wrap items-center gap-1.5">
            <Tag size={11} aria-hidden />
            {tags.map((family) => (
              <span
                key={family}
                className="inline-flex items-center rounded-full border border-border bg-card px-2 py-0.5 text-[11px] font-medium text-foreground"
              >
                {family}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-auto flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
        <Button
          ref={newEntryButtonRef}
          type="button"
          onClick={onStartNew}
          data-testid="cockpit-start-new-entry"
          className="h-10 w-full gap-2 px-4 text-sm font-semibold sm:w-auto"
        >
          + Nouvelle saisie
          <kbd className="rounded border border-white/40 bg-white/15 px-1.5 text-[10px] font-bold uppercase tracking-wide">
            {newEntryShortcut}
          </kbd>
        </Button>
      </div>
    </div>
  );
};

export default CockpitReadonlyView;
