import { type ChangeEvent, useEffect, useState } from 'react';
import { ArrowRight, RotateCcw } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';

import type { CockpitFormLeftPaneProps, CockpitFormRightPaneProps } from '../CockpitPaneTypes';
import AvatarInitials from '../../ui/data-display/AvatarInitials';
import { Input } from '../../ui/inputs/basic/Input';
import { Kbd } from '../../ui/data-display/Kbd';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/inputs/selects/Select';
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
  continueShortcutLabel?: string;
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

export const buildDescriptionOnlySubject = (
  description: string,
  interactionType: string,
  fallbackSubject: string
): string => {
  const normalizedDescription = description.replace(/\s+/g, ' ').trim();
  if (normalizedDescription) return normalizedDescription.slice(0, 120);
  return interactionType.trim() || fallbackSubject;
};

const CockpitGuidedDetailsQuestion = ({
  leftPaneProps,
  rightPaneProps,
  onReset,
  onComplete,
  canComplete = true,
  onEditContact,
  continueShortcutLabel
}: CockpitGuidedDetailsQuestionProps) => {
  const shouldReduceMotion = useReducedMotion();
  const [isShortcutPressed, setIsShortcutPressed] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && event.key === 'Enter') {
        setIsShortcutPressed(true);
      }
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Control' || event.key === 'Meta' || event.key === 'Enter') {
        setIsShortcutPressed(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const handleOrderRefChange = (event: ChangeEvent<HTMLInputElement>) => {
    event.currentTarget.value = event.currentTarget.value.replace(/\D/g, '').slice(0, 6);
    void rightPaneProps.orderRefField.onChange(event);
  };

  const refinedLabelStyle = 'text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground select-none block mb-1.5';

  const fullName = buildContactName(leftPaneProps);
  const position = buildContactPosition(leftPaneProps);
  const hasContact = fullName.length > 0;
  const isDescriptionOnlyRelation = leftPaneProps.relationMode === 'solicitation'
    || leftPaneProps.relationMode === 'internal'
    || leftPaneProps.relationMode === 'supplier';

  if (isDescriptionOnlyRelation) {
    const isInternal = leftPaneProps.relationMode === 'internal';
    const isSupplier = leftPaneProps.relationMode === 'supplier';

    return (
      <CockpitGuidedQuestionFrame
        eyebrow="Description"
        title={isInternal ? 'Relation interne CIR' : isSupplier ? 'Interaction fournisseur' : 'Démarchage téléphonique'}
        description={isInternal
          ? 'Conserve uniquement le contexte utile de l’échange.'
          : isSupplier
            ? 'Note la demande, le fournisseur et la suite utile.'
            : 'Conserve uniquement le contexte utile de l’appel.'}
      >
        <div className="rounded-lg border border-border bg-card p-4 sm:p-5">
          <label className={refinedLabelStyle} htmlFor="interaction-notes">Description</label>
          <textarea
            id="interaction-notes"
            {...rightPaneProps.notesField}
            rows={7}
            className="min-h-[210px] w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground shadow-[inset_0_1.5px_3px_rgba(0,0,0,0.02)] transition-all duration-200 placeholder:text-muted-foreground/80 focus-visible:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/10 focus-visible:ring-offset-0 focus-visible:ring-offset-background mt-2 font-medium"
            placeholder={isInternal
              ? 'Résumé de l’échange interne, décision, suite à donner…'
              : isSupplier
                ? 'Demande fournisseur, référence, délai, suite à donner…'
                : 'Résumé de l’appel, besoin exprimé, suite à donner…'}
            autoComplete="off"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <motion.button
            type="button"
            onClick={onReset}
            whileHover={shouldReduceMotion ? {} : { scale: 1.01 }}
            whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer px-2 py-1 rounded-md"
          >
            <RotateCcw size={13} aria-hidden="true" className="text-muted-foreground/80" />
            Effacer le formulaire
          </motion.button>
          {onComplete ? (
            <motion.button
              type="button"
              onClick={onComplete}
              disabled={!canComplete}
              whileHover={shouldReduceMotion ? {} : { scale: 1.01 }}
              whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
              animate={!shouldReduceMotion && isShortcutPressed ? { scale: 0.96 } : {}}
              initial="initial"
              className={cn(
                "inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 disabled:pointer-events-none disabled:opacity-50 cursor-pointer gap-1.5",
                isShortcutPressed && "bg-primary/95"
              )}
            >
              Continuer
              {continueShortcutLabel ? (
                <Kbd className={cn(
                  'ml-1 border-primary-foreground/30 bg-primary-foreground/15 text-primary-foreground',
                  !canComplete && 'border-muted-foreground/20 bg-muted text-muted-foreground'
                )}>
                  {continueShortcutLabel}
                </Kbd>
              ) : null}
              <motion.span
                variants={{
                  initial: { x: 0 },
                  hover: { x: 3 }
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <ArrowRight size={14} aria-hidden="true" />
              </motion.span>
            </motion.button>
          ) : null}
        </div>
      </CockpitGuidedQuestionFrame>
    );
  }

  return (
    <CockpitGuidedQuestionFrame
      eyebrow="Sujet"
      title="Résumer la demande"
      description="Quelques infos pour finaliser cette interaction."
    >
      <div className="space-y-6">
        {/* Groupe 1 — Demande (Titre & Description) Fusionné */}
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_2px_8px_-1px_rgba(0,0,0,0.02)] transition-all duration-200 focus-within:border-primary/50 focus-within:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.03)]">
          <div className="px-5 py-4 border-b border-border/60 bg-card focus-within:bg-surface-1/30 transition-all duration-150">
            <label className={refinedLabelStyle} htmlFor="subject-input">Titre *</label>
            <Input
              id="subject-input"
              type="text"
              {...rightPaneProps.subjectField}
              className="h-9 w-full min-w-0 text-[13px] font-semibold border-none bg-transparent p-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-none mt-1 placeholder:text-muted-foreground/75 text-foreground"
              placeholder="Vérin ISO 15552 Ø80 course 200…"
              aria-invalid={!!rightPaneProps.errors.subject}
              autoComplete="off"
            />
            {rightPaneProps.errors.subject ? (
              <p className="text-xs text-destructive mt-1 font-medium" role="status" aria-live="polite">
                {rightPaneProps.errors.subject.message}
              </p>
            ) : null}
          </div>

          <div className="px-5 py-4 bg-card focus-within:bg-surface-1/30 transition-all duration-150">
            <label className={refinedLabelStyle} htmlFor="interaction-notes">Description</label>
            <textarea
              id="interaction-notes"
              {...rightPaneProps.notesField}
              rows={4}
              className="min-h-[100px] w-full resize-none border-none bg-transparent p-0 text-[13px] font-medium text-foreground shadow-none outline-none focus:outline-none focus:ring-0 mt-1 placeholder:text-muted-foreground/75 font-medium"
              placeholder="Détails techniques, références constructeur, contexte…"
              autoComplete="off"
            />
          </div>
        </div>

        {/* Groupe 2 — Qualification (Type & Statut) Fusionné */}
        <div className="grid grid-cols-1 sm:grid-cols-2 overflow-hidden rounded-xl border border-border bg-card shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_2px_8px_-1px_rgba(0,0,0,0.02)] transition-all duration-200 focus-within:border-primary/50 focus-within:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.03)]">
          <div className="px-5 py-4 border-b sm:border-b-0 sm:border-r border-border/60 bg-card focus-within:bg-surface-1/30 transition-all duration-150 flex flex-col justify-center min-h-[85px]">
            <label className={refinedLabelStyle} htmlFor="interaction-type">Type d&apos;interaction</label>
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
                className="h-9 w-full min-w-0 text-[13px] font-semibold border-none bg-transparent p-0 shadow-none focus:ring-0 focus:ring-offset-0 mt-1 cursor-pointer"
              >
                <SelectValue placeholder="Choisir un type…" />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {leftPaneProps.interactionTypes.map((type) => (
                  <SelectItem key={type} value={type} className="text-sm font-semibold">
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!leftPaneProps.hasInteractionTypes ? (
              <p id={leftPaneProps.interactionTypeHelpId} className="text-[10px] text-warning mt-1 font-medium">
                Ajoutez des types dans Paramètres.
              </p>
            ) : null}
            {leftPaneProps.errors.interaction_type ? (
              <p className="text-xs text-destructive mt-1 font-medium" role="status" aria-live="polite">
                {leftPaneProps.errors.interaction_type.message}
              </p>
            ) : null}
          </div>

          <div className="px-5 py-4 bg-card focus-within:bg-surface-1/30 transition-all duration-150 flex flex-col justify-center min-h-[85px]">
            <CockpitStatusControl
              footerLabelStyle={refinedLabelStyle}
              statusMeta={rightPaneProps.statusMeta}
              statusCategoryLabel={rightPaneProps.statusCategoryLabel}
              statusCategoryBadges={rightPaneProps.statusCategoryBadges}
              statusTriggerRef={rightPaneProps.statusTriggerRef}
              statusValue={rightPaneProps.statusValue}
              onStatusChange={rightPaneProps.onStatusChange}
              statusGroups={rightPaneProps.statusGroups}
              hasStatuses={rightPaneProps.hasStatuses}
              statusHelpId={rightPaneProps.statusHelpId}
              layout="stacked"
              variant="fused"
            />
          </div>
        </div>

        {/* Groupe 3 — Suivi (N° dossier & Rappel) Fusionné */}
        <div className="grid grid-cols-1 sm:grid-cols-2 overflow-hidden rounded-xl border border-border bg-card shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_2px_8px_-1px_rgba(0,0,0,0.02)] transition-all duration-200 focus-within:border-primary/50 focus-within:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.03)]">
          <div className="px-5 py-4 border-b sm:border-b-0 sm:border-r border-border/60 bg-card focus-within:bg-surface-1/30 transition-all duration-150 flex flex-col justify-center min-h-[85px]">
            <label className={refinedLabelStyle} htmlFor="interaction-order-ref">N° dossier</label>
            <Input
              id="interaction-order-ref"
              type="text"
              {...rightPaneProps.orderRefField}
              onChange={handleOrderRefChange}
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              className="h-9 w-full font-mono text-[13px] border-none bg-transparent p-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-none mt-1 placeholder:text-muted-foreground/75 text-foreground font-semibold"
              placeholder="123456"
              autoComplete="off"
            />
            {rightPaneProps.errors.order_ref ? (
              <p className="text-xs text-destructive mt-1 font-medium" role="status" aria-live="polite">
                {rightPaneProps.errors.order_ref.message}
              </p>
            ) : null}
          </div>

          <div className="px-5 py-4 bg-card focus-within:bg-surface-1/30 transition-all duration-150 flex flex-col justify-center min-h-[85px]">
            <CockpitReminderControl
              footerLabelStyle={refinedLabelStyle}
              reminderField={rightPaneProps.reminderField}
              reminderAt={rightPaneProps.reminderAt}
              onSetReminder={rightPaneProps.onSetReminder}
              layout="stacked"
              variant="fused"
            />
          </div>
        </div>

        {hasContact ? (
          /* Bloc 4 — Contact rattaché */
          <div className="space-y-2">
            <p className={refinedLabelStyle}>Contact rattaché</p>
            <motion.div
              whileHover={shouldReduceMotion ? {} : { y: -0.5 }}
              className="flex items-center gap-4 rounded-xl border border-border border-l-4 border-l-primary bg-surface-1/50 hover:bg-surface-1 px-5 py-4 shadow-sm transition-all duration-200"
            >
              <AvatarInitials name={fullName} size="sm" className="rounded-md ring-1 ring-border/50 shadow-sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-bold text-foreground">
                  {fullName}
                  {position ? <span className="text-[11px] font-medium text-muted-foreground/80"> · {position}</span> : null}
                </p>
              </div>
              {onEditContact ? (
                <motion.button
                  type="button"
                  onClick={onEditContact}
                  whileHover={shouldReduceMotion ? {} : { scale: 1.02 }}
                  whileTap={shouldReduceMotion ? {} : { scale: 0.96 }}
                  className="shrink-0 rounded-md bg-card border border-border px-2.5 py-1 text-xs font-bold text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 cursor-pointer"
                >
                  Modifier
                </motion.button>
              ) : null}
            </motion.div>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
        <motion.button
          type="button"
          onClick={onReset}
          whileHover={shouldReduceMotion ? {} : { scale: 1.01 }}
          whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer px-2 py-1 rounded-md"
        >
          <RotateCcw size={13} aria-hidden="true" className="text-muted-foreground/80" />
          Effacer le formulaire
        </motion.button>
        {onComplete ? (
          <motion.button
            type="button"
            onClick={onComplete}
            disabled={!canComplete}
            whileHover={shouldReduceMotion ? {} : { scale: 1.01 }}
            whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
            animate={!shouldReduceMotion && isShortcutPressed ? { scale: 0.96 } : {}}
            initial="initial"
            className={cn(
              "inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 disabled:pointer-events-none disabled:opacity-50 cursor-pointer gap-1.5",
              isShortcutPressed && "bg-primary/95"
            )}
          >
            Continuer
            {continueShortcutLabel ? (
              <Kbd className={cn(
                'ml-1 border-primary-foreground/30 bg-primary-foreground/15 text-primary-foreground',
                !canComplete && 'border-muted-foreground/20 bg-muted text-muted-foreground'
              )}>
                {continueShortcutLabel}
              </Kbd>
            ) : null}
            <motion.span
              variants={{
                initial: { x: 0 },
                hover: { x: 3 }
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <ArrowRight size={14} aria-hidden="true" />
            </motion.span>
          </motion.button>
        ) : null}
      </div>
    </CockpitGuidedQuestionFrame>
  );
};

export default CockpitGuidedDetailsQuestion;
