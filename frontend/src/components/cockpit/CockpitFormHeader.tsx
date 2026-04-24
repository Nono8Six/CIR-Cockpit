import { Circle } from 'lucide-react';

import { getPlatformShortcutLabel } from '@/app/appConstants';
import { cn } from '@/lib/utils';

import type { DraftStatus } from '@/hooks/useInteractionDraft';

type CockpitFormHeaderProps = {
  canSave: boolean;
  draftStatus?: DraftStatus;
  lastSavedAt?: Date | null;
  savedInteractionId?: string | null;
};

type StatusTone = 'muted' | 'info' | 'warning' | 'success';

type StatusDescriptor = {
  label: string;
  tone: StatusTone;
};

const formatClockTime = (date: Date): string =>
  `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;

const formatInteractionReference = (id: string): string => {
  const compact = id.replace(/-/g, '').slice(0, 6).toUpperCase();
  return compact ? `INT-${compact}` : 'INT';
};

const resolveStatus = (
  draftStatus: DraftStatus,
  lastSavedAt: Date | null,
  savedInteractionId: string | null
): StatusDescriptor => {
  if (savedInteractionId) {
    return {
      label: `Enregistr\u00e9 \u00b7 ${formatInteractionReference(savedInteractionId)}`,
      tone: 'success'
    };
  }
  if (draftStatus === 'saving') {
    return { label: 'Sauvegarde du brouillon\u2026', tone: 'info' };
  }
  if (draftStatus === 'saved') {
    return {
      label: lastSavedAt
        ? `Brouillon sauvegard\u00e9 \u00b7 ${formatClockTime(lastSavedAt)}`
        : 'Brouillon sauvegard\u00e9',
      tone: 'info'
    };
  }
  if (draftStatus === 'error') {
    return { label: 'Sauvegarde brouillon indisponible', tone: 'warning' };
  }
  return { label: 'Saisie en cours \u00b7 non enregistr\u00e9', tone: 'muted' };
};

const TONE_TEXT_STYLES: Record<StatusTone, string> = {
  muted: 'text-muted-foreground',
  info: 'text-info',
  warning: 'text-warning-foreground',
  success: 'text-success'
};

const TONE_DOT_STYLES: Record<StatusTone, string> = {
  muted: 'fill-muted-foreground/70 text-muted-foreground/70',
  info: 'fill-info text-info',
  warning: 'fill-warning text-warning',
  success: 'fill-success text-success'
};

const CockpitFormHeader = ({
  canSave,
  draftStatus = 'idle',
  lastSavedAt = null,
  savedInteractionId = null
}: CockpitFormHeaderProps) => {
  const status = resolveStatus(draftStatus, lastSavedAt, savedInteractionId);
  const submitShortcutLabel = getPlatformShortcutLabel('\u21b5');
  const newEntryShortcutLabel = getPlatformShortcutLabel('N');
  const isSubmitted = Boolean(savedInteractionId);

  return (
    <div
      data-testid="cockpit-form-header"
      className="shrink-0 border-b border-border bg-card px-3 py-2 sm:px-5"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div
          data-testid="cockpit-header-status"
          role="status"
          aria-live="polite"
          className={cn('flex items-center gap-2 text-xs font-semibold', TONE_TEXT_STYLES[status.tone])}
        >
          <Circle className={cn(TONE_DOT_STYLES[status.tone])} size={8} aria-hidden="true" />
          <span>{status.label}</span>
        </div>
        <div
          data-testid="cockpit-header-actions"
          className="flex items-center gap-2"
        >
          {isSubmitted ? (
            <>
              <span className="text-xs font-semibold text-success">Pr\u00eat pour la suivante</span>
              <span className="rounded border border-border bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                {newEntryShortcutLabel}
              </span>
            </>
          ) : (
            <>
              {canSave ? (
                <span className="text-xs font-semibold text-success">Pr\u00eat \u00e0 enregistrer</span>
              ) : null}
              <span className="rounded border border-border bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                {submitShortcutLabel}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CockpitFormHeader;
