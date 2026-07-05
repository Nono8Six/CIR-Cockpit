import { ArrowDown, ArrowUp } from 'lucide-react';

import { Button } from '@/components/ui/inputs/basic/Button';
import type { PricingReferenceSortDirection } from '../../../../../../shared/schemas/pricing/references.schema';

interface SortButtonProps {
  label: string;
  active: boolean;
  direction: PricingReferenceSortDirection;
  onClick: () => void;
}

/**
 * Table column header button to trigger and display sorting state.
 *
 * @param props Sorting properties including label, active status, direction and click handler.
 */
export const SortButton = ({
  label,
  active,
  direction,
  onClick
}: SortButtonProps) => (
  <Button
    type="button"
    variant="ghost"
    size="dataRow"
    className="w-full justify-start gap-1 px-0 text-[11px] font-medium normal-case text-stone-500 hover:bg-transparent hover:text-stone-800"
    aria-label={`Trier par ${label}`}
    onClick={onClick}
  >
    <span className="truncate">{label}</span>
    {active && direction === 'asc' ? (
      <ArrowUp className="size-3" aria-hidden="true" />
    ) : null}
    {active && direction === 'desc' ? (
      <ArrowDown className="size-3" aria-hidden="true" />
    ) : null}
  </Button>
);
