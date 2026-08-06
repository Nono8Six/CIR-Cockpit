import { useCallback, useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowLeft, Pencil, Search } from 'lucide-react';

import type {
  MotorEquivalentCandidateResult,
  MotorEquivalentFromMotorInput,
  MotorEquivalentFromSpecInput,
  MotorMounting
} from 'shared/schemas/configurator/motor.schema';

import { Button } from '@/components/ui/inputs/basic/Button';
import {
  MOTOR_EQUIVALENTS_LONG_WAIT_SECONDS,
  useMotorEquivalentsFromMotor,
  useMotorEquivalentsFromSpec
} from '@/hooks/configurator/useMotorEquivalents';
import { cn } from '@/lib/utils';
import { ConfiguratorEmptyState } from '../ConfiguratorEmptyState';
import { ConfiguratorErrorState } from '../ConfiguratorErrorState';
import { ConfiguratorPendingState } from '../ConfiguratorPendingState';
import { ConfiguratorPageShell, ConfiguratorSection } from '../ConfiguratorPageShell';
import { MotorCandidateDialog } from '../MotorCandidateDialog';
import { MotorCandidateRow } from '../MotorCandidateRow';
import { VerdictBadge } from '../VerdictBadge';
import { MotorNameplateForm } from '../MotorNameplateForm';
import { MotorReferencePicker, type MotorReference } from '../MotorReferencePicker';
import { MountingSelector } from '../MountingSelector';
import { RemainingQuestionsPanel } from '../RemainingQuestionsPanel';
import { SnapshotIdentity } from '../SnapshotIdentity';
import { VerdictTally } from '../VerdictMosaic';
import { VERDICT_SEVERITY_ORDER } from '../configuratorVocabulary';
import {
  EMPTY_NAMEPLATE_DRAFT,
  buildMotorSpecFromNameplate,
  listBlockingNameplateQuestions,
  type NameplateDraft
} from '../buildMotorSpecFromNameplate';

const HEADER_CELL = 'px-3 py-2 text-[11px] font-medium text-muted-foreground';
type EntryMode = 'nameplate' | 'catalog';
type Stage = 'intake' | 'results';

const ENTRY_MODES: readonly { id: EntryMode; label: string; hint: string }[] = [
  { id: 'nameplate', label: 'Plaque signalétique', hint: 'Le client vous dicte ce qu’il lit et ce qu’il mesure.' },
  { id: 'catalog', label: 'Référence au catalogue', hint: 'Le moteur en place figure déjà dans le catalogue technique CIR.' }
];

const MotorReplacementPage = () => {
  const [entryMode, setEntryMode] = useState<EntryMode>('nameplate');
  const [stage, setStage] = useState<Stage>('intake');
  const [nameplate, setNameplate] = useState<NameplateDraft>(EMPTY_NAMEPLATE_DRAFT);
  const [reference, setReference] = useState<MotorReference | null>(null);
  const [catalogMounting, setCatalogMounting] = useState<MotorMounting | null>(null);
  const [submittedSpec, setSubmittedSpec] = useState<MotorEquivalentFromSpecInput | null>(null);
  const [submittedMotor, setSubmittedMotor] = useState<MotorEquivalentFromMotorInput | null>(null);
  const [openedCandidate, setOpenedCandidate] = useState<MotorEquivalentCandidateResult | null>(null);

  const readySpec = useMemo(() => buildMotorSpecFromNameplate(nameplate), [nameplate]);
  const readyMotor = useMemo<MotorEquivalentFromMotorInput | null>(() => {
    if (!reference || !catalogMounting) return null;
    return { operating_point_id: reference.candidate.operating_point_id, mounting: catalogMounting, limit: 25, sort: 'compatibility' };
  }, [catalogMounting, reference]);

  const specQuery = useMotorEquivalentsFromSpec(submittedSpec);
  const fromMotorQuery = useMotorEquivalentsFromMotor(submittedMotor);
  const activeQuery = entryMode === 'nameplate' ? specQuery : fromMotorQuery;
  const readyInput = entryMode === 'nameplate' ? readySpec : readyMotor;
  const blockingQuestions = listBlockingNameplateQuestions(nameplate);

  const launchSearch = useCallback(() => {
    if (entryMode === 'nameplate' && readySpec) {
      setSubmittedSpec(readySpec);
      setSubmittedMotor(null);
      setStage('results');
    }
    if (entryMode === 'catalog' && readyMotor) {
      setSubmittedMotor(readyMotor);
      setSubmittedSpec(null);
      setStage('results');
    }
  }, [entryMode, readyMotor, readySpec]);

  const changeMode = (mode: EntryMode) => {
    setEntryMode(mode);
    setStage('intake');
    setSubmittedSpec(null);
    setSubmittedMotor(null);
  };

  const handleRetry = useCallback(() => { void activeQuery.refetch(); }, [activeQuery]);
  const candidates = activeQuery.data?.candidates ?? [];
  const tallyCells = candidates.map((candidate) => ({
    code: candidate.candidate.operating_point_id,
    label: candidate.candidate.designation,
    status: candidate.overall_status,
    decisive: true
  }));
  const groupedCandidates = VERDICT_SEVERITY_ORDER.slice().reverse()
    .flatMap((status) => candidates.filter((candidate) => candidate.overall_status === status));

  return (
    <ConfiguratorPageShell
      breadcrumbs={[{ label: 'Configurateurs', to: '/configurateurs' }, { label: 'Moteurs', to: '/configurateurs/moteurs' }, { label: 'Remplacement' }]}
      title={stage === 'intake' ? 'Décrivez le moteur en place.' : 'Candidats au remplacement.'}
      titleContinuation={stage === 'intake'
        ? 'L’outil distingue ce qui est lu, mesuré et encore inconnu.'
        : 'Posez la prochaine question utile avant de vous engager.'}
      actions={<Button asChild variant="outline" size="sm"><Link to="/configurateurs/moteurs"><ArrowLeft aria-hidden="true" />Retour aux entrées</Link></Button>}
      banner={activeQuery.data ? <SnapshotIdentity snapshot={activeQuery.data.snapshot} /> : null}
    >
      {stage === 'intake' ? (
        <div className="mx-auto w-full max-w-5xl space-y-5">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="group" aria-label="Origine des informations">
            {ENTRY_MODES.map((mode) => (
              <button
                key={mode.id}
                type="button"
                aria-pressed={entryMode === mode.id}
                onClick={() => { changeMode(mode.id); }}
                className={cn('rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none',
                  entryMode === mode.id ? 'border-foreground bg-foreground text-background' : 'border-border bg-card hover:bg-surface-1')}
              >
                <span className="block text-[13px] font-semibold">{mode.label}</span>
                <span className={cn('mt-0.5 block text-[11px] leading-snug', entryMode === mode.id ? 'text-background/70' : 'text-muted-foreground')}>{mode.hint}</span>
              </button>
            ))}
          </div>

          <ConfiguratorSection id="replacement-intake" label={entryMode === 'nameplate' ? 'Relevé pendant l’appel' : 'Moteur en place'}>
            {entryMode === 'nameplate' ? (
              <MotorNameplateForm draft={nameplate} onChange={setNameplate} />
            ) : (
              <div className="space-y-4">
                <MotorReferencePicker selected={reference} onSelect={setReference} onClear={() => { setReference(null); setCatalogMounting(null); }} className="max-h-[420px]" />
                {reference ? <MountingSelector value={catalogMounting} onChange={setCatalogMounting} /> : null}
              </div>
            )}
          </ConfiguratorSection>

          <div className="sticky bottom-3 z-10 flex flex-col gap-2 rounded-xl border border-border bg-card/95 p-3 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[12px] leading-snug text-muted-foreground">
              {readyInput ? 'Le minimum est renseigné. La recherche dure généralement quelques secondes.' : (entryMode === 'nameplate' ? blockingQuestions.join(' ') : 'Choisissez une référence et sa forme de montage.')}
            </p>
            <Button type="button" disabled={!readyInput} onClick={launchSearch} className="shrink-0">
              <Search aria-hidden="true" /> Rechercher les équivalents
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[13px] font-semibold text-foreground">Relevé utilisé pour cette recherche</p>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                {entryMode === 'nameplate' ? `${nameplate.power_kw} kW · ${nameplate.frequency_hz} Hz · ${nameplate.mounting ?? 'montage inconnu'} · ${nameplate.supply_mode === 'vfd' ? 'variateur' : 'réseau'}` : `${reference?.candidate.designation ?? 'Référence'} · ${catalogMounting ?? ''}`}
              </p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => { setStage('intake'); }}><Pencil aria-hidden="true" />Modifier le relevé</Button>
          </div>

          {activeQuery.isError ? <ConfiguratorErrorState error={activeQuery.error} fallbackMessage="Impossible de rechercher les équivalents." onRetry={handleRetry} /> : null}
          {activeQuery.isPending ? <ConfiguratorPendingState label="Comparaison à l’ensemble du catalogue technique" longWaitThresholdSeconds={MOTOR_EQUIVALENTS_LONG_WAIT_SECONDS} longWaitHint="Chaque candidat est évalué critère par critère : cette recherche prend quelques secondes." skeletonRows={5} /> : null}
          {activeQuery.isSuccess && candidates.length === 0 ? <ConfiguratorEmptyState title="Aucun candidat sur ce montage" description="Vérifiez le montage et les valeurs relevées avec le client, puis relancez la recherche." /> : null}

          {activeQuery.isSuccess && candidates.length > 0 ? (
            <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
              <ConfiguratorSection id="replacement-candidates" label="Candidats les plus proches" aside={<VerdictTally cells={tallyCells} />}>
                <div className="tech-raised hidden overflow-x-auto rounded-xl bg-card sm:block">
                  <table className="w-full min-w-[38rem] border-collapse text-[12px]">
                    <caption className="sr-only">Candidats au remplacement, du plus compatible au moins compatible</caption>
                    <thead><tr className="border-b border-border-subtle text-left"><th className={`${HEADER_CELL} pl-4`}>Moteur</th><th className={HEADER_CELL}>Verdict</th><th className={HEADER_CELL}>Critères</th><th className={HEADER_CELL}>Établis</th><th className={`${HEADER_CELL} pr-4 text-right`}>Caractéristiques</th></tr></thead>
                    <tbody className="divide-y divide-border-subtle">
                      {groupedCandidates.map((candidate) => <MotorCandidateRow key={candidate.candidate.operating_point_id} candidate={candidate} isSelected={openedCandidate?.candidate.operating_point_id === candidate.candidate.operating_point_id} onOpen={setOpenedCandidate} />)}
                    </tbody>
                  </table>
                </div>
                <div className="divide-y divide-border-subtle overflow-hidden rounded-xl border border-border bg-card sm:hidden">
                  {groupedCandidates.map((candidate) => {
                    const established = candidate.criteria.filter((criterion) => criterion.status !== 'indeterminate').length;
                    return (
                      <button
                        key={candidate.candidate.operating_point_id}
                        type="button"
                        onClick={() => { setOpenedCandidate(candidate); }}
                        className="flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-surface-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium text-foreground">{candidate.candidate.brand} {candidate.candidate.designation}</span>
                          <span className="mt-0.5 block font-mono text-[11px] text-muted-foreground">{candidate.candidate.power_kw} kW · {candidate.candidate.poles}P · {established}/{candidate.criteria.length} établis</span>
                        </span>
                        <VerdictBadge status={candidate.overall_status} variant="short" />
                      </button>
                    );
                  })}
                </div>
              </ConfiguratorSection>
              <RemainingQuestionsPanel candidates={candidates} className="order-first xl:order-none xl:sticky xl:top-4" onSelectFact={() => { setStage('intake'); }} />
            </div>
          ) : null}
        </div>
      )}

      <MotorCandidateDialog candidate={openedCandidate} onClose={() => { setOpenedCandidate(null); }} />
    </ConfiguratorPageShell>
  );
};

export default MotorReplacementPage;
