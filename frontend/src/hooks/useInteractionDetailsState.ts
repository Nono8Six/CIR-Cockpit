import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod/v4';

import type { AgencyStatus, Interaction, InteractionUpdate, TimelineEvent } from '@/types';
import { isProspectRelationValue } from '@/constants/relations';
import { buildInteractionEvents } from '@/utils/interactions/buildInteractionEvents';

type InteractionDetailsStateInput = {
  interaction: Interaction;
  statuses: AgencyStatus[];
  onUpdate: (
    interaction: Interaction,
    event: TimelineEvent,
    updates?: InteractionUpdate
  ) => Promise<void> | void;
};

const interactionDetailsFormSchema = z.object({
  note: z.string().max(5000, 'Note trop longue'),
  statusId: z.string().trim().min(1, 'Statut requis'),
  reminder: z.string(),
  orderRef: z.string().trim().max(255, 'Reference trop longue')
}).strict();

type InteractionDetailsFormValues = z.infer<typeof interactionDetailsFormSchema>;

export const useInteractionDetailsState = ({ interaction, statuses, onUpdate }: InteractionDetailsStateInput) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const form = useForm<InteractionDetailsFormValues>({
    resolver: zodResolver(interactionDetailsFormSchema),
    defaultValues: {
      note: '',
      statusId: interaction.status_id ?? '',
      reminder: interaction.reminder_at || '',
      orderRef: interaction.order_ref || ''
    },
    mode: 'onChange'
  });

  const { control, setValue, reset, handleSubmit } = form;
  const note = useWatch({ control, name: 'note' }) ?? '';
  const statusId = useWatch({ control, name: 'statusId' }) ?? '';
  const reminder = useWatch({ control, name: 'reminder' }) ?? '';
  const orderRef = useWatch({ control, name: 'orderRef' }) ?? '';

  const statusById = useMemo(() => { const map = new Map<string, AgencyStatus>(); statuses.forEach(status => { if (status.id) map.set(status.id, status); }); return map; }, [statuses]);
  const statusOptions = useMemo(() => {
    const options = statuses.filter((status): status is AgencyStatus & { id: string } => typeof status.id === 'string').map(status => ({ id: status.id, label: status.label }));
    if (interaction.status_id && !statusById.has(interaction.status_id)) options.push({ id: interaction.status_id, label: interaction.status });
    return options;
  }, [interaction.status, interaction.status_id, statusById, statuses]);

  const canConvert = useMemo(() => Boolean(interaction.entity_id && isProspectRelationValue(interaction.entity_type)), [interaction.entity_id, interaction.entity_type]);
  const isSubmitDisabled = useMemo(() => !note.trim() && statusId === (interaction.status_id ?? '') && reminder === (interaction.reminder_at || '') && orderRef === (interaction.order_ref || ''), [interaction.order_ref, interaction.reminder_at, interaction.status_id, note, orderRef, reminder, statusId]);

  useEffect(() => {
    reset({
      note: '',
      statusId: interaction.status_id ?? statuses.find(status => status.label === interaction.status)?.id ?? '',
      reminder: interaction.reminder_at || '',
      orderRef: interaction.order_ref || ''
    });
    setErrorMessage(null);
  }, [interaction, reset, statuses]);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [interaction.timeline]);

  const submitUpdates = handleSubmit((values) => {
    setErrorMessage(null);
    const { events, updates } = buildInteractionEvents({
      interaction,
      statusId: values.statusId,
      reminder: values.reminder,
      orderRef: values.orderRef,
      note: values.note,
      statusById
    });
    if (events.length === 0 || !updates) return;
    events.forEach((event, index) => onUpdate(interaction, event, index === events.length - 1 ? updates : undefined));
    setValue('note', '', { shouldDirty: true, shouldValidate: true });
  }, () => {
    const firstError = form.formState.errors.statusId?.message
      ?? form.formState.errors.note?.message
      ?? form.formState.errors.orderRef?.message
      ?? form.formState.errors.reminder?.message
      ?? 'Verification du formulaire impossible.';
    setErrorMessage(firstError);
  });

  const setNote = useCallback((value: string) => {
    setValue('note', value, { shouldDirty: true, shouldValidate: true });
  }, [setValue]);
  const setStatusId = useCallback((value: string) => {
    setValue('statusId', value, { shouldDirty: true, shouldValidate: true });
  }, [setValue]);
  const setReminder = useCallback((value: string) => {
    setValue('reminder', value, { shouldDirty: true, shouldValidate: true });
  }, [setValue]);
  const setOrderRef = useCallback((value: string) => {
    setValue('orderRef', value, { shouldDirty: true, shouldValidate: true });
  }, [setValue]);
  const handleInteractionSubmit = useCallback(() => {
    void submitUpdates();
  }, [submitUpdates]);

  return { note, setNote, statusId, setStatusId, reminder, setReminder, orderRef, setOrderRef, statusOptions, canConvert, scrollRef, isSubmitDisabled, handleSubmit: handleInteractionSubmit, errorMessage };
};
