import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { Badge } from '@/components/ui/data-display/Badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/data-display/Table';
import { Button } from '@/components/ui/inputs/basic/Button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/inputs/selects/Select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/feedback/Tooltip';
import { getAdminUsers } from '@/services/admin/getAdminUsers';
import { getAgencies } from '@/services/agency/getAgencies';
import { getAiUsageSummary, listAiUsageEvents } from '@/services/ai';
import { adminUsersKey, agenciesKey, aiUsageEventsKey, aiUsageSummaryKey } from '@/services/query/queryKeys';
import type { AiFeature, AiUsageEvent, AiUsageStatus } from '../../../../shared/schemas/ai.schema';
import { AiUsageEventDialog } from './AiUsageEventDialog';
import {
  AI_DAYS,
  Field,
  Metric,
  SectionState,
  featureLabels,
  features,
  formatCost,
  formatDate,
  formatNumber,
} from './aiAdminUi';

const PAGE_SIZE = 25;

const statusLabels: Record<AiUsageStatus, string> = {
  success: 'Succès',
  error: 'Erreur',
  blocked: 'Bloqué',
  cache_hit: 'Cache',
};

const statusVariant = (status: AiUsageStatus) => {
  if (status === 'success') return 'success' as const;
  if (status === 'error' || status === 'blocked') return 'destructive' as const;
  return 'secondary' as const;
};

const capabilityLabel = (feature: AiFeature) =>
  feature === 'assistant.referentiels'
    ? `${featureLabels[feature]} (retiré)`
    : featureLabels[feature];

const userDisplayName = (user: {
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string;
}) =>
  user.display_name
    || [user.first_name, user.last_name].filter(Boolean).join(' ').trim()
    || user.email;

const eventTokenTotal = (event: AiUsageEvent) =>
  event.input_tokens + event.output_tokens + event.cached_input_tokens + event.reasoning_tokens;

const DailyHistogram = ({
  points,
}: {
  points: Array<{ date: string; calls: number }>;
}) => {
  if (points.length === 0 || points.every((point) => point.calls === 0)) {
    return (
      <SectionState>Aucun appel sur les 30 derniers jours.</SectionState>
    );
  }

  const max = Math.max(1, ...points.map((point) => point.calls));
  const first = points[0]?.date;
  const last = points[points.length - 1]?.date;

  return (
    <section aria-label="Évolution quotidienne" className="space-y-2">
      <h4 className="text-xs font-semibold text-foreground">Évolution quotidienne</h4>
      <div
        className="flex h-24 items-end gap-1 border-b border-border"
        role="img"
        aria-label="Appels IA par jour civil sur 30 jours"
      >
        {points.map((point) => (
          <Tooltip key={point.date}>
            <TooltipTrigger asChild>
              <div
                className="min-w-1 flex-1 rounded-t-sm bg-primary/70"
                style={{ height: `${Math.max(4, (point.calls / max) * 100)}%` }}
              />
            </TooltipTrigger>
            <TooltipContent>
              {point.date} : {formatNumber.format(point.calls)} appels
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
      <div className="flex justify-between text-[11px] text-muted-foreground">
        <span>{first ?? ''}</span>
        <span>Appels / jour civil</span>
        <span>{last ?? ''}</span>
      </div>
    </section>
  );
};

export const AiJournalView = () => {
  const [page, setPage] = useState(1);
  const [feature, setFeature] = useState<AiFeature | 'all'>('all');
  const [status, setStatus] = useState<AiUsageStatus | 'all'>('all');
  const [userId, setUserId] = useState('all');
  const [agencyId, setAgencyId] = useState('all');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const listFilters = {
    ...(feature !== 'all' ? { feature } : {}),
    ...(status !== 'all' ? { status } : {}),
    ...(userId !== 'all' ? { user_id: userId } : {}),
    ...(agencyId !== 'all' ? { agency_id: agencyId } : {}),
  };

  const summary = useQuery({
    queryKey: aiUsageSummaryKey(AI_DAYS),
    queryFn: () => getAiUsageSummary({ days: AI_DAYS }),
  });
  const events = useQuery({
    queryKey: aiUsageEventsKey(page, PAGE_SIZE, listFilters),
    queryFn: () => listAiUsageEvents({
      page,
      page_size: PAGE_SIZE,
      ...listFilters,
    }),
  });
  const users = useQuery({
    queryKey: adminUsersKey(),
    queryFn: getAdminUsers,
  });
  const agencies = useQuery({
    queryKey: agenciesKey(false),
    queryFn: () => getAgencies(false),
  });

  const nameMaps = useMemo(() => {
    const usersById = new Map<string, string>();
    const agenciesById = new Map<string, string>();
    for (const user of users.data ?? []) {
      usersById.set(user.id, userDisplayName(user));
      for (const membership of user.memberships) {
        agenciesById.set(membership.agency_id, membership.agency_name);
      }
    }
    for (const agency of agencies.data ?? []) {
      agenciesById.set(agency.id, agency.name);
    }
    return { usersById, agenciesById };
  }, [users.data, agencies.data]);

  const changeFilter = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setPage(1);
  };

  const total = events.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  if (summary.isPending || events.isPending) {
    return <SectionState>Chargement du journal…</SectionState>;
  }
  if (summary.isError || events.isError) {
    return <SectionState>Le journal n’a pas pu être chargé.</SectionState>;
  }

  const s = summary.data.summary;

  return (
    <TooltipProvider>
      <div className="space-y-5" data-testid="ai-journal-view">
        <header>
          <h3 className="text-sm font-semibold text-foreground">Journal d’exécution</h3>
          <p className="mt-1 max-w-[72ch] text-xs text-muted-foreground">
            Filtrez et paginez côté serveur, puis ouvrez un événement pour inspecter ses métadonnées publiques.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-3">
          <Metric
            label="Appels sur 30 jours"
            value={formatNumber.format(s.calls)}
            detail={`${formatNumber.format(s.failed_calls)} en échec`}
          />
          <Metric label="Coût" value={formatCost.format(s.cost_amount)} />
          <Metric
            label="Cache"
            value={formatNumber.format(s.cache_hits)}
            detail="réponses servies sans nouvel appel"
          />
        </div>

        <DailyHistogram points={s.daily} />

        <div className="flex flex-wrap gap-3">
          <Field label="Capacité">
            <Select
              value={feature}
              onValueChange={changeFilter((value: string) => setFeature(value as AiFeature | 'all'))}
            >
              <SelectTrigger className="w-56" density="dense" aria-label="Filtrer par capacité">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les capacités</SelectItem>
                {features.map(([value]) => (
                  <SelectItem key={value} value={value}>
                    {capabilityLabel(value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Statut">
            <Select value={status} onValueChange={changeFilter((value: string) => setStatus(value as AiUsageStatus | 'all'))}>
              <SelectTrigger className="w-40" density="dense" aria-label="Filtrer par statut">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                {(Object.keys(statusLabels) as AiUsageStatus[]).map((value) => (
                  <SelectItem key={value} value={value}>
                    {statusLabels[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Membre">
            <Select value={userId} onValueChange={changeFilter(setUserId)}>
              <SelectTrigger className="w-56" density="dense" aria-label="Filtrer par membre">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les membres</SelectItem>
                {(users.data ?? []).map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {userDisplayName(user)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Agence">
            <Select value={agencyId} onValueChange={changeFilter(setAgencyId)}>
              <SelectTrigger className="w-56" density="dense" aria-label="Filtrer par agence">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les agences</SelectItem>
                {(agencies.data ?? []).map((agency) => (
                  <SelectItem key={agency.id} value={agency.id}>
                    {agency.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div className="overflow-hidden rounded-md border border-border bg-background">
          <Table>
            <TableHeader className="bg-surface-1/80">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Capacité</TableHead>
                <TableHead>Membre / agence</TableHead>
                <TableHead>Modèle</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Tokens</TableHead>
                <TableHead className="text-right">Coût</TableHead>
                <TableHead className="text-right">Latence</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.data.events.map((event) => (
                <TableRow
                  key={event.id}
                  className="cursor-pointer"
                  data-testid={`ai-journal-row-${event.id}`}
                  tabIndex={0}
                  aria-label={`Inspecter l’événement ${event.request_id}`}
                  onClick={() => setSelectedEventId(event.id)}
                  onKeyDown={(keyboardEvent) => {
                    if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') {
                      keyboardEvent.preventDefault();
                      setSelectedEventId(event.id);
                    }
                  }}
                >
                  <TableCell className="whitespace-nowrap">{formatDate(event.created_at)}</TableCell>
                  <TableCell>{featureLabels[event.feature]}</TableCell>
                  <TableCell>
                    {event.user_id ? nameMaps.usersById.get(event.user_id) ?? 'Membre supprimé' : 'Système'}
                    <p className="text-[11px] text-muted-foreground">
                      {event.agency_id ? nameMaps.agenciesById.get(event.agency_id) ?? 'Agence supprimée' : 'Sans agence'}
                    </p>
                  </TableCell>
                  <TableCell className="font-mono text-[11px]">{event.model_id}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(event.status)}>{statusLabels[event.status]}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="font-mono tabular-nums">
                          {formatNumber.format(eventTokenTotal(event))}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        {formatNumber.format(event.input_tokens)} entrée · {formatNumber.format(event.output_tokens)} sortie · {formatNumber.format(event.cached_input_tokens)} cache · {formatNumber.format(event.reasoning_tokens)} raisonnement
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatCost.format(event.cost_amount ?? 0)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {event.latency_ms !== null ? `${formatNumber.format(event.latency_ms)} ms` : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {events.data.events.length === 0 ? (
            <SectionState>Aucun événement pour ces filtres.</SectionState>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-muted-foreground">
          <p className="font-mono tabular-nums" data-testid="ai-journal-total">
            {formatNumber.format(total)} événement{total > 1 ? 's' : ''} · page {formatNumber.format(safePage)} / {formatNumber.format(totalPages)}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={safePage <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Précédent
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={safePage >= totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            >
              Suivant
            </Button>
          </div>
        </div>

        <AiUsageEventDialog
          eventId={selectedEventId}
          open={Boolean(selectedEventId)}
          onOpenChange={(open) => {
            if (!open) setSelectedEventId(null);
          }}
        />
      </div>
    </TooltipProvider>
  );
};
