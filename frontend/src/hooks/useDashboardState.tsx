import { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Car, Mail, Phone, Store } from 'lucide-react';

import type { AgencyStatus, Interaction, InteractionUpdate, TimelineEvent } from '@/types';
import type { ConvertClientEntity } from '@/components/ConvertClientDialog';
import type { KanbanColumns } from '@/components/dashboard/DashboardKanban';
import { isProspectRelationValue } from '@/constants/relations';
import { getTodayIsoDate } from '@/utils/date/getTodayIsoDate';
import { getPresetDateRange, type FilterPeriod } from '@/utils/date/getPresetDateRange';
import { getStartOfDay } from '@/utils/date/getStartOfDay';
import { getEndOfDay } from '@/utils/date/getEndOfDay';
import { toTimestamp } from '@/utils/date/toTimestamp';
import { isBeforeNow } from '@/utils/date/isBeforeNow';
import { useAddTimelineEvent } from './useAddTimelineEvent';
import { interactionsKey } from '@/services/query/queryKeys';
import { notifySuccess } from '@/services/errors/notify';
import { isAppError } from '@/services/errors/AppError';
import { Channel } from '@/types';

type ViewMode = 'kanban' | 'list';
type UseDashboardStateParams = { interactions: Interaction[]; statuses: AgencyStatus[]; agencyId: string | null; onRequestConvert: (entity: ConvertClientEntity) => void };

export const useDashboardState = ({ interactions, statuses, agencyId, onRequestConvert }: UseDashboardStateParams) => {
  const [viewMode, setViewMode] = useState<ViewMode>('kanban'); const [searchTerm, setSearchTerm] = useState(''); const [selectedInteraction, setSelectedInteraction] = useState<Interaction | null>(null); const [period, setPeriod] = useState<FilterPeriod>('today'); const [startDate, setStartDate] = useState(getTodayIsoDate()); const [endDate, setEndDate] = useState(getTodayIsoDate());
  const queryClient = useQueryClient(); const addTimelineMutation = useAddTimelineEvent(agencyId);

  const presetDates = useMemo(() => getPresetDateRange(period, startDate, endDate), [period, startDate, endDate]);
  const effectiveStartDate = period === 'custom' ? startDate : presetDates.startDate; const effectiveEndDate = period === 'custom' ? endDate : presetDates.endDate;
  const statusById = useMemo(() => { const map = new Map<string, AgencyStatus>(); statuses.forEach(status => { if (status.id) map.set(status.id, status); }); return map; }, [statuses]);
  const statusByLabel = useMemo(() => new Map(statuses.map(status => [status.label.toLowerCase(), status])), [statuses]);
  const getStatusMeta = useCallback((interaction: Interaction) => interaction.status_id ? statusById.get(interaction.status_id) ?? statusByLabel.get(interaction.status.toLowerCase()) : statusByLabel.get(interaction.status.toLowerCase()), [statusById, statusByLabel]);
  const isStatusDone = useCallback((interaction: Interaction) => typeof interaction.status_is_terminal === 'boolean' ? interaction.status_is_terminal : Boolean(getStatusMeta(interaction)?.is_terminal || getStatusMeta(interaction)?.category === 'done'), [getStatusMeta]);
  const isStatusTodo = useCallback((interaction: Interaction) => Boolean(getStatusMeta(interaction)?.category === 'todo' || getStatusMeta(interaction)?.is_default), [getStatusMeta]);
  const getStatusBadgeClass = useCallback((interaction: Interaction) => { const meta = getStatusMeta(interaction); const isTerminal = typeof interaction.status_is_terminal === 'boolean' ? interaction.status_is_terminal : meta?.is_terminal; if (meta?.category === 'todo' || meta?.is_default) return 'bg-red-50 text-red-700 border-red-100'; if (meta?.category === 'done' || isTerminal) return 'bg-emerald-50 text-emerald-700 border-emerald-100'; return 'bg-orange-50 text-orange-700 border-orange-100'; }, [getStatusMeta]);

  const filteredData = useMemo(() => {
    let data = interactions; const lower = searchTerm.toLowerCase();
    if (searchTerm) data = data.filter(i => i.company_name.toLowerCase().includes(lower) || i.contact_name.toLowerCase().includes(lower) || i.subject.toLowerCase().includes(lower) || (i.order_ref && i.order_ref.includes(lower)) || (i.contact_phone && i.contact_phone.includes(lower)) || (i.contact_email && i.contact_email.toLowerCase().includes(lower)) || i.mega_families.some(f => f.toLowerCase().includes(lower)));
    const sTime = getStartOfDay(effectiveStartDate).getTime(); const eTime = getEndOfDay(effectiveEndDate).getTime();
    if (viewMode === 'list') return data.filter(i => { const createdAt = toTimestamp(i.created_at); return createdAt >= sTime && createdAt <= eTime; }).sort((a, b) => toTimestamp(b.created_at) - toTimestamp(a.created_at));
    return data.filter(i => !isStatusDone(i) || (() => { const createdAt = toTimestamp(i.created_at); return createdAt >= sTime && createdAt <= eTime; })());
  }, [effectiveEndDate, effectiveStartDate, interactions, isStatusDone, searchTerm, viewMode]);

  const kanbanColumns = useMemo<KanbanColumns | null>(() => viewMode === 'list' ? null : {
    urgencies: filteredData.filter(i => isStatusTodo(i) || (i.reminder_at ? isBeforeNow(i.reminder_at) && !isStatusDone(i) : false)),
    inProgress: filteredData.filter(i => !isStatusTodo(i) && !isStatusDone(i) && !(i.reminder_at ? isBeforeNow(i.reminder_at) : false)),
    completed: filteredData.filter(i => isStatusDone(i))
  }, [filteredData, isStatusDone, isStatusTodo, viewMode]);

  const getChannelIcon = useCallback((channel: string) => {
    switch (channel) { case Channel.PHONE: return <Phone size={14} className="text-slate-600" />; case Channel.EMAIL: return <Mail size={14} className="text-slate-600" />; case Channel.COUNTER: return <Store size={14} className="text-slate-600" />; case Channel.VISIT: return <Car size={14} className="text-slate-600" />; default: return <Phone size={14} />; }
  }, []);

  const handleConvertRequest = useCallback((interaction: Interaction) => { if (!interaction.entity_id || !isProspectRelationValue(interaction.entity_type)) return; onRequestConvert({ id: interaction.entity_id, name: interaction.company_name, client_number: null, account_type: null }); }, [onRequestConvert]);
  const handleInteractionUpdate = useCallback(async (interaction: Interaction, event: TimelineEvent, updates?: InteractionUpdate) => {
    try {
      const updated = await addTimelineMutation.mutateAsync({ interaction, event, updates });
      if (selectedInteraction?.id === interaction.id) setSelectedInteraction(updated);
      const message = updates?.status_id ? `Statut change : ${statusById.get(updates.status_id)?.label ?? updates.status ?? 'Statut mis a jour'}` : updates?.status ? `Statut change : ${updates.status}` : updates?.order_ref ? 'N° de dossier enregistre' : event.type === 'note' ? 'Note ajoutee' : 'Dossier mis a jour';
      notifySuccess(message);
    } catch (error) {
      if (isAppError(error) && error.code === 'CONFLICT') { setSelectedInteraction(null); if (agencyId) void queryClient.invalidateQueries({ queryKey: interactionsKey(agencyId) }); }
    }
  }, [addTimelineMutation, agencyId, queryClient, selectedInteraction, statusById]);

  return { viewMode, searchTerm, selectedInteraction, period, effectiveStartDate, effectiveEndDate, filteredData, kanbanColumns, getStatusMeta, getStatusBadgeClass, getChannelIcon, setViewMode, setSearchTerm, setPeriod, setSelectedInteraction, handleStartDateChange: (value: string) => { setPeriod('custom'); setStartDate(value); }, handleEndDateChange: (value: string) => { setPeriod('custom'); setEndDate(value); }, handleConvertRequest, handleInteractionUpdate };
};

