import { useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ArchiveRestore, History, Link2, List, Plus, Unlink } from 'lucide-react';

import type { ConfigUsageRow, ConfigUsageSnapshot } from '../../../../../shared/schemas/system/config.schema';
import { useSettingsMutations } from '@/hooks/settings-state/use-settings-mutations';
import { notifySuccess } from '@/services/errors/notifySuccess';
import { Button } from '@/components/ui/inputs/basic/Button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/inputs/selects/Select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/feedback/Sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/navigation/Tabs';
import ConfirmDialog from '@/components/ConfirmDialog';
import SettingsSectionShell from '../ui/SettingsSectionShell';
import IntegrityInteractionsSheet from './IntegrityInteractionsSheet';
import { DIMENSION_LABELS, type IntegrityAction } from './integrity.constants';
import SystemManagedValues from './SystemManagedValues';

interface IntegritySectionProps {
  agencyId: string | null;
  readOnly: boolean;
  usage: ConfigUsageSnapshot | null;
  canRunImmediateAction: () => boolean;
}

const UsageTable = ({ rows, action, allowChanges = true }: { rows: ConfigUsageRow[]; action: (row: ConfigUsageRow, kind: IntegrityAction) => void; allowChanges?: boolean }) => (
  <div className="divide-y divide-border border border-border bg-background">
    {rows.length === 0 ? <div className="p-4 text-xs text-muted-foreground">Aucune valeur dans cette section.</div> : rows.map((row) => (
      <div key={`${row.dimension}-${row.label}-${row.state}`} className="grid gap-2 px-3 py-2 text-xs md:grid-cols-[9rem_minmax(0,1fr)_5rem_auto] md:items-center">
        <span className="text-muted-foreground">{row.dimension ? DIMENSION_LABELS[row.dimension] : 'Référentiel'}</span>
        <span className="min-w-0 truncate font-medium">{row.label}{row.target_label ? ` → ${row.target_label}` : ''}</span>
        <span className="font-mono tabular-nums text-muted-foreground">{row.usage_count}</span>
        <div className="flex flex-wrap justify-end gap-1">
          <Button size="dense" variant="ghost" onClick={() => action(row, 'inspect')}><List />{row.state === 'system_managed' ? 'Voir les interactions' : 'Examiner'}</Button>
          {allowChanges && row.state === 'unresolved' ? <Button size="dense" variant="outline" onClick={() => action(row, 'resolve')}><Link2 />Rattacher</Button> : null}
          {allowChanges && row.state === 'unresolved' && row.dimension !== 'statuses' ? <Button size="dense" variant="outline" onClick={() => action(row, 'create')}><Plus />Créer la valeur</Button> : null}
          {allowChanges && (row.state === 'archived_used' || row.state === 'archived_unused') ? <Button size="dense" variant="outline" onClick={() => action(row, 'restore')}><ArchiveRestore />Réactiver</Button> : null}
          {allowChanges && row.state === 'resolved_historical' ? <Button size="dense" variant="outline" onClick={() => action(row, 'unresolve')}><Unlink />Annuler</Button> : null}
        </div>
      </div>
    ))}
  </div>
);

const IntegritySection = ({ agencyId, readOnly, usage, canRunImmediateAction }: IntegritySectionProps) => {
  const navigate = useNavigate();
  const { referenceActionMutation } = useSettingsMutations(agencyId);
  const [selected, setSelected] = useState<ConfigUsageRow | null>(null);
  const [resolveRow, setResolveRow] = useState<ConfigUsageRow | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ row: ConfigUsageRow; kind: 'restore' | 'unresolve' | 'create' } | null>(null);
  const [targetId, setTargetId] = useState('');
  const rows = useMemo(() => Object.values(usage?.dimensions ?? {}).flat(), [usage]);
  const unresolved = rows.filter((row) => row.state === 'unresolved');
  const archived = rows.filter((row) => row.state === 'archived_used' || row.state === 'archived_unused');
  const resolved = rows.filter((row) => row.state === 'resolved_historical');
  const system = rows.filter((row) => row.state === 'system_managed');
  const activeTargets = resolveRow ? rows.filter((row) => row.dimension === resolveRow.dimension && (row.state === 'active_used' || row.state === 'active_unused') && row.reference_id) : [];
  const selectedActiveTargets = selected ? rows.filter((row) => row.dimension === selected.dimension && (row.state === 'active_used' || row.state === 'active_unused') && row.reference_id) : [];
  const archivedExactMatch = resolveRow ? archived.find((row) => row.dimension === resolveRow.dimension && row.label.trim().toLowerCase() === resolveRow.label.trim().toLowerCase()) : null;
  const mutate = async (row: ConfigUsageRow, kind: 'restore' | 'unresolve' | 'create') => {
    if (!agencyId || readOnly) return;
    try {
      if (kind === 'restore') await referenceActionMutation.mutateAsync({ action: 'restore', agency_id: agencyId, dimension: row.dimension ?? 'services', reference_id: row.reference_id ?? undefined, label: row.label });
      if (kind === 'unresolve' && row.resolution_id) await referenceActionMutation.mutateAsync({ action: 'unresolve', agency_id: agencyId, resolution_id: row.resolution_id });
      if (kind === 'create' && row.dimension !== 'statuses') await referenceActionMutation.mutateAsync({ action: 'add', agency_id: agencyId, dimension: row.dimension ?? 'services', label: row.label });
    } catch {
      return;
    }
    setConfirmAction(null);
    notifySuccess(kind === 'restore' ? 'Valeur réactivée.' : kind === 'create' ? 'Valeur créée.' : 'Rattachement annulé.');
  };
  const handleAction = (row: ConfigUsageRow, kind: IntegrityAction) => {
    if (kind === 'inspect') { setSelected(row); return; }
    if (!canRunImmediateAction()) return;
    if (kind === 'resolve') { setResolveRow(row); setTargetId(''); return; }
    setConfirmAction({ row, kind });
  };
  const handleResolve = async () => {
    if (!agencyId || !resolveRow || !targetId) return;
    try {
      await referenceActionMutation.mutateAsync({ action: 'resolve', agency_id: agencyId, dimension: resolveRow.dimension ?? 'services', source_label: resolveRow.label, target_reference_id: targetId });
    } catch {
      return;
    }
    setResolveRow(null); setTargetId(''); notifySuccess('Rattachement historique enregistré.');
  };
  return (
    <SettingsSectionShell id="settings-section-integrity" title="Historique & intégrité" description="Auditez les valeurs retirées, rattachez les anciens libellés et consultez les parcours automatiques attendus." icon={History} badge={unresolved.length > 0 ? `${unresolved.length} à traiter` : 'À jour'} badgeTone={unresolved.length > 0 ? 'warning' : 'default'}>
      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        {[['À traiter', unresolved.length], ['Archives', archived.length], ['Rattachements', resolved.length]].map(([name, count]) => <div key={name} className="border border-border bg-background p-3"><div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{name}</div><div className="mt-1 font-mono text-xl font-semibold">{count}</div></div>)}
      </div>
      <Tabs defaultValue={unresolved.length > 0 ? 'unresolved' : 'archives'}>
        <TabsList><TabsTrigger value="unresolved">À traiter</TabsTrigger><TabsTrigger value="archives">Archives</TabsTrigger><TabsTrigger value="resolved">Rattachements</TabsTrigger></TabsList>
        <TabsContent value="unresolved"><UsageTable rows={unresolved} action={handleAction} allowChanges={!readOnly} /></TabsContent>
        <TabsContent value="archives"><UsageTable rows={archived} action={handleAction} allowChanges={!readOnly} /></TabsContent>
        <TabsContent value="resolved"><UsageTable rows={resolved} action={handleAction} allowChanges={!readOnly} /></TabsContent>
      </Tabs>
      <SystemManagedValues rows={system} onAction={handleAction} />
      {agencyId ? <IntegrityInteractionsSheet key={`${selected?.dimension ?? 'none'}-${selected?.label ?? 'none'}`} agencyId={agencyId} readOnly={readOnly} selected={selected} activeTargets={selectedActiveTargets} onClose={() => setSelected(null)} onOpenDashboard={(interactionId) => { setSelected(null); void navigate({ to: '/dashboard', search: { interactionId } }); }} onReferenceAction={(row, kind) => { setSelected(null); handleAction(row, kind); }} /> : null}
      <Sheet open={Boolean(resolveRow)} onOpenChange={(open) => { if (!open) setResolveRow(null); }}>
        <SheetContent><SheetHeader><SheetTitle>Rattacher le libellé historique</SheetTitle><SheetDescription>Le libellé brut reste conservé. Les filtres et agrégats utiliseront la valeur active choisie.</SheetDescription></SheetHeader><div className="mt-4 space-y-3"><Select value={targetId} onValueChange={setTargetId}><SelectTrigger><SelectValue placeholder="Choisir une valeur active" /></SelectTrigger><SelectContent>{activeTargets.map((row) => <SelectItem key={row.reference_id} value={row.reference_id ?? ''}>{row.label}</SelectItem>)}</SelectContent></Select><Button disabled={!targetId || readOnly || referenceActionMutation.isPending} onClick={() => void handleResolve()}>Confirmer le rattachement</Button>{archivedExactMatch ? <Button variant="outline" onClick={() => { if (!archivedExactMatch) return; setResolveRow(null); setConfirmAction({ row: archivedExactMatch, kind: 'restore' }); }}><ArchiveRestore />Réactiver cette valeur</Button> : null}{resolveRow?.dimension !== 'statuses' ? <Button variant="outline" onClick={() => { if (!resolveRow) return; setResolveRow(null); setConfirmAction({ row: resolveRow, kind: 'create' }); }}><Plus />Créer la valeur</Button> : null}</div></SheetContent>
      </Sheet>
      <ConfirmDialog
        open={Boolean(confirmAction)}
        onOpenChange={(open) => { if (!open) setConfirmAction(null); }}
        title={confirmAction?.kind === 'restore' ? 'Réactiver cette valeur ?' : confirmAction?.kind === 'create' ? 'Créer cette valeur active ?' : 'Annuler ce rattachement ?'}
        description={confirmAction?.kind === 'restore' ? 'La valeur redeviendra disponible dans les futures saisies.' : confirmAction?.kind === 'create' ? 'Le libellé historique deviendra une valeur active proposée dans les futures saisies.' : 'Les filtres et indicateurs ne regrouperont plus cet ancien libellé avec sa cible actuelle.'}
        confirmLabel={confirmAction?.kind === 'restore' ? 'Réactiver' : confirmAction?.kind === 'create' ? 'Créer la valeur' : 'Annuler le rattachement'}
        onConfirm={() => { if (confirmAction) void mutate(confirmAction.row, confirmAction.kind); }}
      />
    </SettingsSectionShell>
  );
};

export default IntegritySection;
