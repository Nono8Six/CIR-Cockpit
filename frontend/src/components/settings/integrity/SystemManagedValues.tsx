import { List, ShieldCheck } from 'lucide-react';

import type { ConfigUsageRow } from '../../../../../shared/schemas/system/config.schema';
import { Badge } from '@/components/ui/data-display/Badge';
import { Button } from '@/components/ui/inputs/basic/Button';
import { DIMENSION_LABELS, type IntegrityAction } from './integrity.constants';
import { groupSystemManagedRows } from './system-managed-values';

interface SystemManagedValuesProps {
  rows: ConfigUsageRow[];
  onAction: (row: ConfigUsageRow, action: IntegrityAction) => void;
}

const usageLabel = (count: number): string =>
  `${count} interaction${count > 1 ? 's' : ''}`;

const SystemManagedValues = ({ rows, onAction }: SystemManagedValuesProps) => {
  const groups = groupSystemManagedRows(rows);
  if (groups.length === 0) return null;

  return (
    <details className="mt-4 border border-border bg-surface-1 p-3">
      <summary className="cursor-pointer text-xs font-semibold">
        <ShieldCheck className="mr-2 inline size-4" />
        Parcours automatiques ({groups.length})
      </summary>
      <p className="mt-2 max-w-3xl text-xs text-muted-foreground">
        Ces libellés sont ajoutés volontairement par l’application lors de certains parcours. Ils ne sont ni supprimés, ni à corriger.
      </p>
      <div className="mt-3 divide-y divide-border border border-border bg-background">
        {groups.map((group) => (
          <section key={group.key} className="grid gap-3 p-3 text-xs md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <div className="min-w-0">
              <h4 className="font-semibold">{group.title}</h4>
              <p className="mt-1 text-muted-foreground">{group.description}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {group.rows.map((row) => (
                  <Badge key={`${row.dimension}-${row.label}`} variant="outline" className="font-normal">
                    {row.dimension ? DIMENSION_LABELS[row.dimension] : 'Référentiel'} : {row.label}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 md:justify-end">
              <span className="font-mono tabular-nums text-muted-foreground">{usageLabel(group.inspectRow.usage_count)}</span>
              <Button size="dense" variant="ghost" onClick={() => onAction(group.inspectRow, 'inspect')}>
                <List />
                Consulter
              </Button>
            </div>
          </section>
        ))}
      </div>
    </details>
  );
};

export default SystemManagedValues;
