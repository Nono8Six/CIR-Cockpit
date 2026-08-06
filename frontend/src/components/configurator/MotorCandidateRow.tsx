import type { MotorEquivalentCandidateResult } from 'shared/schemas/configurator/motor.schema';

import { cn } from '@/lib/utils';
import { CoverageMeter } from './CoverageMeter';
import { VerdictBadge } from './VerdictBadge';
import { VerdictMosaic, type MosaicCell } from './VerdictMosaic';

export const toMosaicCells = (
  candidate: MotorEquivalentCandidateResult
): MosaicCell[] =>
  candidate.criteria.map((criterion) => ({
    code: criterion.code,
    label: criterion.label,
    status: criterion.status,
    decisive: criterion.blocking
  }));

type MotorCandidateRowProps = {
  candidate: MotorEquivalentCandidateResult;
  isSelected: boolean;
  onOpen: (candidate: MotorEquivalentCandidateResult) => void;
};

/**
 * Une ligne de candidat.
 *
 * Densite de tableur : la ligne tient sur deux niveaux de texte et se balaye a
 * la verticale. Trois lectures s'y superposent, de la plus rapide a la plus
 * precise — la puce de verdict, la mosaique critère par critère, puis la
 * couverture chiffree. Aucun score global : ce chiffre n'existe pas.
 */
export const MotorCandidateRow = ({
  candidate,
  isSelected,
  onOpen
}: MotorCandidateRowProps) => {
  const cells = toMosaicCells(candidate);
  const establishedCount = cells.filter((cell) => cell.status !== 'indeterminate').length;

  return (
    <tr
      className={cn(
        'cursor-pointer transition-colors duration-100 hover:bg-surface-1 motion-reduce:transition-none',
        isSelected && 'bg-accent/50'
      )}
      data-verdict={candidate.overall_status}
      onClick={() => { onOpen(candidate); }}
    >
      <th scope="row" className="py-2 pl-4 pr-3 text-left font-normal">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onOpen(candidate);
          }}
          className="rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="block truncate text-[13px] font-medium text-foreground underline-offset-2 hover:underline">
            {candidate.candidate.brand} {candidate.candidate.designation}
          </span>
          <span className="block truncate text-[11px] text-muted-foreground">
            {candidate.candidate.variant_key ?? candidate.candidate.series ?? '—'}
          </span>
        </button>
      </th>
      <td className="px-3 py-2">
        <VerdictBadge status={candidate.overall_status} variant="short" />
      </td>
      <td className="px-3 py-2">
        <VerdictMosaic cells={cells} size="sm" />
      </td>
      <td className="px-3 py-2">
        <CoverageMeter
          established={establishedCount}
          total={cells.length}
          status={candidate.overall_status}
          label="Critères établis"
        />
      </td>
      <td className="whitespace-nowrap py-2 pl-3 pr-4 text-right font-mono text-[12px] tabular-nums">
        <span className="text-foreground">{candidate.candidate.power_kw} kW</span>
        <span className="block text-[11px] text-muted-foreground">
          {candidate.candidate.poles}P · {candidate.candidate.efficiency_class ?? '—'}
        </span>
      </td>
    </tr>
  );
};
