import type { MotorEquivalentCandidateResult } from 'shared/schemas/configurator/motor.schema';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/feedback/Dialog';
import { CriteriaTable } from './CriteriaTable';
import { IssuesPanel } from './IssuesPanel';
import { MissingFactsPanel } from './MissingFactsPanel';
import { RequiredActionsPanel } from './RequiredActionsPanel';
import { VerdictSummary } from './VerdictSummary';
import { toMosaicCells } from './MotorCandidateRow';

type MotorCandidateDialogProps = {
  candidate: MotorEquivalentCandidateResult | null;
  onClose: () => void;
};

/**
 * Verdict complet d'un candidat, en dialog centre.
 *
 * L'ordre de lecture est celui de la decision : le verdict et sa phrase, puis
 * ce qui est actionnable — adaptations, controles, manques — puis seulement le
 * detail critere par critere. Les anomalies du catalogue ferment la lecture :
 * elles ne changent pas le verdict, elles bornent ce qu'on peut en dire.
 */
export const MotorCandidateDialog = ({ candidate, onClose }: MotorCandidateDialogProps) => (
  <Dialog
    open={candidate !== null}
    onOpenChange={(open) => {
      if (!open) onClose();
    }}
  >
    <DialogContent className="max-h-[88vh] max-w-4xl grid-rows-[auto_minmax(0,1fr)] overflow-hidden">
      {candidate ? (
        <>
          <DialogHeader>
            <DialogTitle className="text-[17px]">
              {candidate.candidate.brand} {candidate.candidate.designation}
            </DialogTitle>
            <DialogDescription className="text-[12px]">
              {candidate.candidate.variant_key
                ? `Variante ${candidate.candidate.variant_key} · `
                : ''}
              {candidate.candidate.power_kw} kW · {candidate.candidate.poles} pôles ·{' '}
              {candidate.candidate.rated_speed_rpm} tr/min · {candidate.candidate.frequency_hz} Hz
            </DialogDescription>
          </DialogHeader>
          <div className="-mx-1 space-y-4 overflow-y-auto px-1 pb-1">
            <VerdictSummary
              status={candidate.overall_status}
              explanation={candidate.explanation}
              cells={toMosaicCells(candidate)}
            />
            <RequiredActionsPanel kind="adaptation" actions={candidate.adaptations_required} />
            <RequiredActionsPanel kind="check" actions={candidate.checks_required} />
            <MissingFactsPanel missingFacts={candidate.missing_facts} />
            <CriteriaTable
              caption={`Critères évalués pour ${candidate.candidate.designation}`}
              criteria={candidate.criteria}
            />
            <IssuesPanel issues={candidate.issues} />
          </div>
        </>
      ) : null}
    </DialogContent>
  </Dialog>
);
