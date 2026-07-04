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
    size="sm"
    className="h-7 w-full justify-start px-1.5 text-[11px] uppercase tracking-wide text-muted-foreground hover:text-foreground"
    aria-label={`Trier par ${label}`}
    onClick={onClick}
  >
    <span className="truncate">{label}</span>
    {active && direction === 'asc' ? (
      <ArrowUp className="ml-auto size-3.5" aria-hidden="true" />
    ) : null}
    {active && direction === 'desc' ? (
      <ArrowDown className="ml-auto size-3.5" aria-hidden="true" />
    ) : null}
  </Button>
);
