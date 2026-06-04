import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArchiveRestore, ChevronDown, ChevronRight, ExternalLink, Link2, PencilLine, Plus } from 'lucide-react';

import type {
  ConfigIntegrityInteractionRow,
  ConfigUsageRow
} from '../../../../../shared/schemas/system/config.schema';
import ConfirmDialog from '@/components/ConfirmDialog';
import { Badge } from '@/components/ui/data-display/Badge';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/feedback/Sheet';
import { Skeleton } from '@/components/ui/feedback/Skeleton';
import { Button } from '@/components/ui/inputs/basic/Button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/inputs/selects/Select';
import { useNotifyError } from '@/hooks/cockpit-utils/useNotifyError';
import { useIntegrityInteractionUpdate } from '@/hooks/settings-state/use-integrity-interaction-update';
import { getConfigIntegrityInteractions } from '@/services/config';
import { notifySuccess } from '@/services/errors/notifySuccess';
import { configIntegrityInteractionsKey } from '@/services/query/queryKeys';
import { DIMENSION_LABELS, type IntegrityAction } from './integrity.constants';

interface IntegrityInteractionsSheetProps {
  agencyId: string;
  readOnly: boolean;
  selected: ConfigUsageRow | null;
  activeTargets: ConfigUsageRow[];
  onClose: () => void;
  onOpenDashboard: (interactionId: string) => void;
  onReferenceAction: (row: ConfigUsageRow, action: IntegrityAction) => void;
}

const formatDate = (value: string | null): string =>
  value ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';

const Detail = ({ label, value }: { label: string; value: string | null }) => (
  <div><dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt><dd className="mt-1 break-words text-xs">{value || '—'}</dd></div>
);

const InteractionDetails = ({ item }: { item: ConfigIntegrityInteractionRow }) => (
  <dl className="grid gap-3 border-t border-border bg-surface-1 p-3 sm:grid-cols-2">
    <Detail label="Canal" value={item.channel} />
    <Detail label="Relation" value={item.entity_type} />
    <Detail label="Contact" value={item.contact_name} />
    <Detail label="Coordonnées" value={[item.contact_phone, item.contact_email].filter(Boolean).join(' · ')} />
    <Detail label="Service brut" value={item.contact_service} />
    <Detail label="Type brut" value={item.interaction_type} />
    <Detail label="Statut brut" value={item.status || '<sans valeur>'} />
    <Detail label="Familles brutes" value={item.mega_families.join(', ')} />
    <Detail label="Référence commande" value={item.order_ref} />
    <Detail label="Relance" value={formatDate(item.reminder_at)} />
    <Detail label="Dernière action" value={formatDate(item.last_action_at)} />
    <Detail label="Dernière mise à jour" value={formatDate(item.updated_at)} />
    <div className="sm:col-span-2"><Detail label="Notes" value={item.notes} /></div>
  </dl>
);

const IntegrityInteractionsSheet = ({
  agencyId,
  readOnly,
  selected,
  activeTargets,
  onClose,
  onOpenDashboard,
  onReferenceAction
}: IntegrityInteractionsSheetProps) => {
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [targetByInteraction, setTargetByInteraction] = useState<Record<string, string>>({});
  const [pendingCorrection, setPendingCorrection] = useState<ConfigIntegrityInteractionRow | null>(null);
  const updateMutation = useIntegrityInteractionUpdate(agencyId);
  const input = selected ? {
    agency_id: agencyId,
    dimension: selected.dimension ?? 'services',
    source_label: selected.label,
    classification: selected.state,
    page,
    page_size: 20
  } : null;
  const query = useQuery({
    queryKey: input ? configIntegrityInteractionsKey(input) : ['config-integrity-interactions', 'none'],
    queryFn: () => input ? getConfigIntegrityInteractions(input) : Promise.reject(),
    enabled: Boolean(input)
  });
  useNotifyError(query.error, 'Impossible de charger les interactions concernées.', 'IntegrityInteractionsSheet');

  const submitCorrection = async () => {
    if (!selected || !pendingCorrection) return;
    const targetId = targetByInteraction[pendingCorrection.id];
    if (!targetId) return;
    try {
      await updateMutation.mutateAsync({
        agency_id: agencyId,
        interaction_id: pendingCorrection.id,
        dimension: selected.dimension ?? 'services',
        source_label: selected.label,
        target_reference_id: targetId
      });
    } catch {
      return;
    }
    notifySuccess('Interaction corrigée.');
    setPendingCorrection(null);
    onClose();
  };

  return (
    <>
      <Sheet open={Boolean(selected)} onOpenChange={(open) => { if (!open) onClose(); }}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-3xl">
          <SheetHeader>
            <SheetTitle>Inspecter les interactions</SheetTitle>
            <SheetDescription>Consultez les données historiques et corrigez une interaction précise sans modifier les autres dossiers.</SheetDescription>
          </SheetHeader>
          {selected ? (
            <div className="mt-4 border border-border bg-surface-1 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={selected.state === 'unresolved' ? 'warning' : 'secondary'}>{DIMENSION_LABELS[selected.dimension ?? 'services']}</Badge>
                <span className="text-sm font-semibold">{selected.label}</span>
                <span className="font-mono text-xs tabular-nums text-muted-foreground">{query.data?.total ?? selected.usage_count} interaction(s)</span>
              </div>
              {!readOnly && selected.state === 'unresolved' ? <div className="mt-3 flex flex-wrap gap-2"><Button size="dense" variant="outline" onClick={() => onReferenceAction(selected, 'resolve')}><Link2 />Rattacher globalement</Button>{selected.dimension !== 'statuses' ? <Button size="dense" variant="outline" onClick={() => onReferenceAction(selected, 'create')}><Plus />Créer la valeur</Button> : null}</div> : null}
              {!readOnly && (selected.state === 'archived_used' || selected.state === 'archived_unused') ? <Button className="mt-3" size="dense" variant="outline" onClick={() => onReferenceAction(selected, 'restore')}><ArchiveRestore />Réactiver la valeur</Button> : null}
            </div>
          ) : null}
          <div className="mt-4 space-y-2">
            {query.isLoading ? [1, 2, 3].map((key) => <Skeleton key={key} className="h-24 w-full" />) : null}
            {query.isError ? <div className="border border-destructive/30 bg-destructive/5 p-4 text-xs text-destructive">Le chargement a échoué. Fermez puis rouvrez l’inspecteur pour réessayer.</div> : null}
            {query.data?.interactions.map((item) => {
              const expanded = expandedId === item.id;
              const targetId = targetByInteraction[item.id] ?? '';
              return (
                <article key={item.id} className="border border-border bg-background">
                  <button type="button" className="flex w-full items-start gap-2 p-3 text-left hover:bg-surface-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => setExpandedId(expanded ? null : item.id)} aria-expanded={expanded}>
                    {expanded ? <ChevronDown className="mt-0.5 size-4 shrink-0" /> : <ChevronRight className="mt-0.5 size-4 shrink-0" />}
                    <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold">{item.subject}</span><span className="mt-1 block truncate text-xs text-muted-foreground">{item.company_name} · {formatDate(item.created_at)}</span></span>
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{expanded ? 'Réduire' : 'Détails'}</span>
                  </button>
                  {expanded ? (
                    <>
                      <InteractionDetails item={item} />
                      <div className="space-y-3 border-t border-border p-3">
                        {!readOnly && selected?.state !== 'system_managed' && activeTargets.length > 0 ? <div><div className="text-xs font-semibold">Corriger cette interaction uniquement</div><p className="mt-1 text-xs text-muted-foreground">Choisissez une valeur active. Le libellé brut de ce dossier sera corrigé sans créer de rattachement global.</p><div className="mt-2 flex flex-col gap-2 sm:flex-row"><Select value={targetId} onValueChange={(value) => setTargetByInteraction((current) => ({ ...current, [item.id]: value }))}><SelectTrigger aria-label="Valeur active de remplacement"><SelectValue placeholder="Choisir une valeur active…" /></SelectTrigger><SelectContent>{activeTargets.map((row) => <SelectItem key={row.reference_id} value={row.reference_id ?? ''}>{row.label}</SelectItem>)}</SelectContent></Select><Button disabled={!targetId || updateMutation.isPending} onClick={() => setPendingCorrection(item)}><PencilLine />Corriger ce dossier</Button></div></div> : null}
                        <Button size="dense" variant="outline" onClick={() => onOpenDashboard(item.id)}><ExternalLink />Ouvrir dans le pilotage</Button>
                      </div>
                    </>
                  ) : null}
                </article>
              );
            })}
            {query.data && query.data.interactions.length === 0 ? <div className="border border-border p-4 text-xs text-muted-foreground">Aucune interaction ne correspond encore à cette valeur.</div> : null}
          </div>
          <div className="mt-3 flex items-center justify-between"><Button size="dense" variant="outline" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Précédent</Button><span className="text-xs text-muted-foreground">Page {page}</span><Button size="dense" variant="outline" disabled={!query.data || page * query.data.page_size >= query.data.total} onClick={() => setPage((value) => value + 1)}>Suivant</Button></div>
        </SheetContent>
      </Sheet>
      <ConfirmDialog open={Boolean(pendingCorrection)} onOpenChange={(open) => { if (!open) setPendingCorrection(null); }} title="Corriger uniquement cette interaction ?" description="Le dossier sélectionné utilisera la nouvelle valeur. Les autres interactions et les rattachements historiques resteront inchangés." confirmLabel="Corriger ce dossier" onConfirm={() => void submitCorrection()} />
    </>
  );
};

export default IntegrityInteractionsSheet;
