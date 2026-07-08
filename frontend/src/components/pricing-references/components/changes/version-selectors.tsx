import { ArrowRight } from 'lucide-react';

import type { PricingReferenceDiffsSummaryResponse } from '../../../../../../shared/schemas/pricing/references.schema';
import { NativeSelect } from '../inputs/form-field';
import { formatDateTime } from '../../utils/pricing-references-formatters';
import { formatFileVersionLabel, type PricingReferenceFileVersion } from './changes-utils';

interface VersionSelectorsProps {
  fileVersions: readonly PricingReferenceFileVersion[];
  targetImportId: string;
  baseSelection: string;
  autoBaseLabel: string;
  summary: PricingReferenceDiffsSummaryResponse | null;
  onTargetChange: (importId: string) => void;
  onBaseChange: (selection: string) => void;
}

const selectTriggerClassName =
  'h-7 w-full border-border bg-background text-xs transition-colors hover:border-border/90 [&>span]:truncate';

/**
 * Sélecteurs du couple comparé, cadrés sur UN fichier : base (automatique = base
 * du run courant, ou une version distincte du fichier) et cible. Les listes ne
 * proposent QUE des versions du fichier du périmètre courant — jamais l'autre
 * fichier — et les libellés portent nom exact + date pour identifier la version.
 */
export const VersionSelectors = ({
  fileVersions,
  targetImportId,
  baseSelection,
  autoBaseLabel,
  summary,
  onTargetChange,
  onBaseChange
}: VersionSelectorsProps) => {
  const targetOptions = fileVersions.map((version) => ({
    value: version.importId,
    label: formatFileVersionLabel(version)
  }));
  const baseOptions = [
    { value: 'auto', label: autoBaseLabel },
    ...fileVersions
      .filter((version) => version.importId !== targetImportId)
      .map((version) => ({ value: version.importId, label: formatFileVersionLabel(version) }))
  ];

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 border-b border-stone-200/60 px-4 py-2">
      <span className="shrink-0 text-[11px] text-stone-500">Base</span>
      <div className="w-full min-w-0 sm:w-72">
        <NativeSelect
          id="changes-base-version"
          label="Version de base de la comparaison"
          hideLabel
          triggerClassName={selectTriggerClassName}
          value={baseSelection}
          options={baseOptions}
          onChange={onBaseChange}
        />
      </div>
      <ArrowRight className="hidden size-3.5 shrink-0 text-stone-400 sm:block" aria-hidden="true" />
      <span className="shrink-0 text-[11px] text-stone-500">Cible</span>
      <div className="w-full min-w-0 sm:w-72">
        <NativeSelect
          id="changes-target-version"
          label="Version cible de la comparaison"
          hideLabel
          triggerClassName={selectTriggerClassName}
          value={targetImportId}
          options={targetOptions}
          onChange={onTargetChange}
        />
      </div>
      {summary ? (
        <span className="ml-auto whitespace-nowrap text-[11px] text-stone-500">
          Calculée le {formatDateTime(summary.computed_at)}
        </span>
      ) : null}
    </div>
  );
};
