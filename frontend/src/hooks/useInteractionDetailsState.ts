import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { AgencyStatus, Interaction, InteractionUpdate, TimelineEvent } from '@/types';
import { isProspectRelationValue } from '@/constants/relations';
import { buildInteractionEvents } from '@/utils/interactions/buildInteractionEvents';

type InteractionDetailsStateInput = { interaction: Interaction; statuses: AgencyStatus[]; onUpdate: (interaction: Interaction, event: TimelineEvent, updates?: InteractionUpdate) => void };

export const useInteractionDetailsState = ({ interaction, statuses, onUpdate }: InteractionDetailsStateInput) => {
  const [note, setNote] = useState(''); const [statusId, setStatusId] = useState(interaction.status_id ?? ''); const [reminder, setReminder] = useState(interaction.reminder_at || ''); const [orderRef, setOrderRef] = useState(interaction.order_ref || ''); const scrollRef = useRef<HTMLDivElement>(null);

  const statusById = useMemo(() => { const map = new Map<string, AgencyStatus>(); statuses.forEach(status => { if (status.id) map.set(status.id, status); }); return map; }, [statuses]);
  const statusOptions = useMemo(() => {
    const options = statuses.filter((status): status is AgencyStatus & { id: string } => typeof status.id === 'string').map(status => ({ id: status.id, label: status.label }));
    if (interaction.status_id && !statusById.has(interaction.status_id)) options.push({ id: interaction.status_id, label: interaction.status });
    return options;
  }, [interaction.status, interaction.status_id, statusById, statuses]);

  const canConvert = useMemo(() => Boolean(interaction.entity_id && isProspectRelationValue(interaction.entity_type)), [interaction.entity_id, interaction.entity_type]);
  const isSubmitDisabled = useMemo(() => !note.trim() && statusId === (interaction.status_id ?? '') && reminder === (interaction.reminder_at || '') && orderRef === (interaction.order_ref || ''), [interaction.order_ref, interaction.reminder_at, interaction.status_id, note, orderRef, reminder, statusId]);

  useEffect(() => { setStatusId(interaction.status_id ?? statuses.find(status => status.label === interaction.status)?.id ?? ''); setReminder(interaction.reminder_at || ''); setOrderRef(interaction.order_ref || ''); }, [interaction, statuses]);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [interaction.timeline]);

  const handleSubmit = useCallback(() => {
    const { events, updates } = buildInteractionEvents({ interaction, statusId, reminder, orderRef, note, statusById });
    if (events.length === 0 || !updates) return;
    events.forEach((event, index) => onUpdate(interaction, event, index === events.length - 1 ? updates : undefined));
    setNote('');
  }, [interaction, note, onUpdate, orderRef, reminder, statusById, statusId]);

  return { note, setNote, statusId, setStatusId, reminder, setReminder, orderRef, setOrderRef, statusOptions, canConvert, scrollRef, isSubmitDisabled, handleSubmit };
};
