import type { Ref } from 'react';

import type { PricingReferenceDiffRow } from '../../../../../../shared/schemas/pricing/references.schema';
import { cn } from '@/lib/utils';
import { diffTypeLabels } from '../../utils/pricing-references-formatters';
import {
  diffTypeDotClassName,
  diffTypeShortLabels,
  formatDiffColumnPreview,
  getDiffColumnChanges,
  getDiffRowContext
} from './changes-utils';

interface ChangeRowButtonProps {
  change: PricingReferenceDiffRow;
  onSelect: (changeId: string) => void;
  ref?: Ref<HTMLButtonElement>;
}

/**
 * Ligne de changement 36 px : dot du type (D7), clé objet en mono, contexte
 * lisible (marque, libellé) et aperçu des colonnes changées (« remise_ha 12→15 »).
 * Ouvre le dialog de détail avant/après.
 */
export const ChangeRowButton = ({ change, onSelect, ref }: ChangeRowButtonProps) => {
  const context = getDiffRowContext(change);
  const columnChanges = getDiffColumnChanges(change);
  const isModification = change.diff_type === 'modifie' && columnChanges.length > 0;
  const previewTitle = columnChanges.map(formatDiffColumnPreview).join(' · ');

  return (
    <button
      ref={ref}
      type="button"
      onClick={() => onSelect(change.id)}
      aria-label={`Voir le détail du changement (${diffTypeLabels[change.diff_type]}) : ${change.object_key}`}
      className="flex h-9 w-full items-center gap-3 border-b border-stone-100 px-4 text-left text-xs transition-colors last:border-b-0 hover:bg-stone-50 focus-visible:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/45"
    >
      <span
        className={cn('size-1.5 shrink-0 rounded-full', diffTypeDotClassName[change.diff_type])}
        title={diffTypeLabels[change.diff_type]}
        aria-hidden="true"
      />
      <span
        className="w-40 shrink-0 truncate font-mono text-[11px] tabular-nums text-stone-950"
        title={change.object_key}
      >
        {change.object_key}
      </span>
      <span className="min-w-0 flex-1 truncate">
        {context.marque ? <span className="text-stone-950">{context.marque}</span> : null}
        {context.marque && context.description ? (
          <span className="text-stone-300" aria-hidden="true">
            {' · '}
          </span>
        ) : null}
        {context.description ? <span className="text-stone-500">{context.description}</span> : null}
      </span>
      {isModification ? (
        <span
          className="hidden max-w-64 shrink-0 truncate font-mono text-[11px] tabular-nums text-stone-500 sm:block"
          title={previewTitle}
        >
          {formatDiffColumnPreview(columnChanges[0])}
          {columnChanges.length > 1 ? ` +${columnChanges.length - 1}` : ''}
        </span>
      ) : (
        <span className="hidden shrink-0 text-[11px] text-stone-500 sm:block">
          {diffTypeShortLabels[change.diff_type]}
        </span>
      )}
    </button>
  );
};
