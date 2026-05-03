import type { ChangeEvent } from 'react';
import { ArrowRight, RotateCcw } from 'lucide-react';

import type { CockpitFormLeftPaneProps, CockpitFormRightPaneProps } from '../CockpitPaneTypes';
import AvatarInitials from '@/components/ui/avatar-initials';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import CockpitReminderControl from '../right/CockpitReminderControl';
import CockpitStatusControl from '../right/CockpitStatusControl';
import CockpitGuidedQuestionFrame from './CockpitGuidedQuestionFrame';

type CockpitGuidedDetailsQuestionProps = {
  leftPaneProps: CockpitFormLeftPaneProps;
  rightPaneProps: CockpitFormRightPaneProps;
  onReset: () => void;
  onComplete?: () => void;
  canComplete?: boolean;
  onEditContact?: () => void;
};

const buildContactName = (props: CockpitFormLeftPaneProps): string => {
  if (props.selectedContact) {
    return [props.selectedContact.first_name ?? '', props.selectedContact.last_name ?? '']
      .filter(Boolean)
      .join(' ')
      .trim() || 'Contact';
  }
  const manual = [props.contactFirstName, props.contactLastName].filter(Boolean).join(' ').trim();
  return manual || props.contactName || props.contactPhone || '';
};

const buildContactPosition = (props: CockpitFormLeftPaneProps): string =>
  props.selectedContact?.position?.trim() || props.contactPosition?.trim() || '';

const SectionDivider = () => (
  <div aria-hidden="true" className="h-px w-full bg-[hsl(var(--border-subtle))]" />
);

const fieldRowStyle = 'grid min-w-0 gap-2 sm:grid-cols-[170px_minmax(0,1fr)] sm:items-start';

const CockpitGuidedDetailsQuestion = ({
  leftPaneProps,
  rightPaneProps,
  onReset,
  onComplete,
  canComplete = true,
  onEditContact
}: CockpitGuidedDetailsQuestionProps) => {
  const handleOrderRefChange = (event: ChangeEvent<HTMLInputElement>) => {
    event.currentTarget.value = event.currentTarget.value.replace(/\D/g, '').slice(0, 6);
    void rightPaneProps.orderRefField.onChange(event);
  };

  const labelStyle = rightPaneProps.labelStyle;
  const fullName = buildContactName(leftPaneProps);
  const position = buildContactPosition(leftPaneProps);
  const hasContact = fullName.length > 0;

  return (
    <CockpitGuidedQuestionFrame
      eyebrow="Sujet"
      title="Résumer la demande"
      description="Quelques infos pour finaliser cette interaction."
    >
      <div className="space-y-5 rounded-lg border border-border bg-card p-5 sm:p-6">
        {/* Bloc 1 — Demande */}
        <div className="space-y-3">
          <div className={cn(fieldRowStyle, 'sm:items-center')}>
            <label className={cn(labelStyle, 'mb-0')} htmlFor="subject-input">Titre *</label>
            <div className="min-w-0 space-y-1.5">
              <Input
                id="subject-input"
                type="text"
                {...rightPaneProps.subjectField}
                className="h-10 w-full min-w-0 text-[15px] font-medium"
                placeholder="Vérin ISO 15552 Ø80 course 200…"
                aria-invalid={!!rightPaneProps.errors.subject}
                autoComplete="off"
              />
            </div>
            {rightPaneProps.errors.subject ? (
              <p className="text-xs text-destructive sm:col-start-2" role="status" aria-live="polite">
                {rightPaneProps.errors.subject.message}
              </p>
            ) : null}
          </div>

          <div className={fieldRowStyle}>
            <label className={labelStyle} htmlFor="interaction-notes">Description</label>
            <textarea
              id="interaction-notes"
              {...rightPaneProps.notesField}
              rows={4}
              className="min-h-[120px] w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground transition-colors placeholder:text-muted-foreground/80 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              placeholder="Détails techniques, références constructeur, contexte…"
              autoComplete="off"
            />
          </div>
        </div>

        <SectionDivider />

        {/* Bloc 2 — Qualification */}
        <div className="space-y-3">
          <div className={cn(fieldRowStyle, 'sm:items-center')}>
            <label className={cn(labelStyle, 'mb-0')} htmlFor="interaction-type">Type d&apos;interaction</label>
            <Select
              value={leftPaneProps.interactionType}
              onValueChange={(value) =>
                leftPaneProps.setValue('interaction_type', value, { shouldValidate: true, shouldDirty: true })
              }
              disabled={!leftPaneProps.hasInteractionTypes}
            >
              <SelectTrigger
                id="interaction-type"
                ref={leftPaneProps.interactionTypeRef}
                aria-describedby={leftPaneProps.hasInteractionTypes ? undefined : leftPaneProps.interactionTypeHelpId}
                className="h-10 w-full min-w-0 text-sm font-medium"
              >
                <SelectValue placeholder="Choisir un type…" />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {leftPaneProps.interactionTypes.map((type) => (
                  <SelectItem key={type} value={type} className="text-sm">
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!leftPaneProps.hasInteractionTypes ? (
              <p id={leftPaneProps.interactionTypeHelpId} className="text-xs text-warning">
                Ajoutez des types d&apos;interaction dans Paramètres.
              </p>
            ) : null}
            {leftPaneProps.errors.interaction_type ? (
              <p className="text-xs text-destructive sm:col-start-2" role="status" aria-live="polite">
                {leftPaneProps.errors.interaction_type.message}
              </p>
            ) : null}
          </div>

          <CockpitStatusControl
            footerLabelStyle={labelStyle}
            statusMeta={rightPaneProps.statusMeta}
            statusCategoryLabel={rightPaneProps.statusCategoryLabel}
            statusCategoryBadges={rightPaneProps.statusCategoryBadges}
            statusTriggerRef={rightPaneProps.statusTriggerRef}
            statusValue={rightPaneProps.statusValue}
            onStatusChange={rightPaneProps.onStatusChange}
            statusGroups={rightPaneProps.statusGroups}
            hasStatuses={rightPaneProps.hasStatuses}
            statusHelpId={rightPaneProps.statusHelpId}
            layout="inline"
          />
        </div>

        <SectionDivider />

        {/* Bloc 3 — Suivi */}
        <div className="space-y-3">
          <div className={cn(fieldRowStyle, 'sm:items-center')}>
            <label className={cn(labelStyle, 'mb-0')} htmlFor="interaction-order-ref">N° dossier</label>
            <Input
              id="interaction-order-ref"
              type="text"
              {...rightPaneProps.orderRefField}
              onChange={handleOrderRefChange}
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              className="h-10 w-full font-mono text-sm"
              placeholder="123456"
              autoComplete="off"
            />
            {rightPaneProps.errors.order_ref ? (
              <p className="text-xs text-destructive sm:col-start-2" role="status" aria-live="polite">
                {rightPaneProps.errors.order_ref.message}
              </p>
            ) : null}
          </div>

          <CockpitReminderControl
            footerLabelStyle={labelStyle}
            reminderField={rightPaneProps.reminderField}
            reminderAt={rightPaneProps.reminderAt}
            onSetReminder={rightPaneProps.onSetReminder}
            layout="inline"
          />
        </div>

        {hasContact ? (
          <>
            <SectionDivider />
            {/* Bloc 4 — Contact rattaché */}
            <div className={cn(fieldRowStyle, 'sm:items-center')}>
              <p className={cn(labelStyle, 'mb-0')}>Contact rattaché</p>
              <div className="flex items-center gap-3 rounded-md bg-surface-1/60 px-3 py-2.5">
                <AvatarInitials name={fullName} size="sm" className="rounded-md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {fullName}
                    {position ? <span className="text-muted-foreground"> · {position}</span> : null}
                  </p>
                </div>
                {onEditContact ? (
                  <button
                    type="button"
                    onClick={onEditContact}
                    className="shrink-0 rounded-md px-1.5 py-0.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:underline"
                  >
                    Modifier
                  </button>
                ) : null}
              </div>
            </div>
          </>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <RotateCcw size={13} aria-hidden="true" />
          Effacer le formulaire
        </Button>
        {onComplete ? (
          <Button
            type="button"
            size="sm"
            onClick={onComplete}
            disabled={!canComplete}
            className="gap-1.5"
          >
            Continuer
            <ArrowRight size={14} aria-hidden="true" />
          </Button>
        ) : null}
      </div>
    </CockpitGuidedQuestionFrame>
  );
};

export default CockpitGuidedDetailsQuestion;
