import { Check, Columns3, Rows3 } from 'lucide-react';
import type { DirectoryDensity } from 'shared/schemas/directory.schema';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface DirectoryTableViewColumn {
  id: string;
  label: string;
  canHide: boolean;
  isVisible: boolean;
}

interface DirectoryTableViewOptionsProps {
  columns: DirectoryTableViewColumn[];
  density: DirectoryDensity;
  onToggleColumn: (columnId: string) => void;
  onDensityChange: (density: DirectoryDensity) => void;
}

const DirectoryTableViewOptions = ({
  columns,
  density,
  onToggleColumn,
  onDensityChange
}: DirectoryTableViewOptionsProps) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="dense" className="h-9 rounded-md px-3 text-sm shadow-none">
          <Columns3 className="size-3.5" />
          Affichage
        </Button>
      </PopoverTrigger>
    <PopoverContent align="end" className="w-[320px] space-y-4">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">Colonnes visibles</p>
        <p className="text-xs text-muted-foreground">
          Masquez les colonnes secondaires sans toucher aux données affichées.
        </p>
      </div>
      <div className="space-y-2">
        {columns.map((column) => (
          <Button
            key={column.id}
            type="button"
            variant={column.isVisible ? 'secondary' : 'outline'}
            size="sm"
            className="w-full justify-between"
            disabled={!column.canHide}
            onClick={() => onToggleColumn(column.id)}
          >
            <span>{column.label}</span>
            <Check className={cn('size-4', column.isVisible ? 'opacity-100' : 'opacity-0')} />
          </Button>
        ))}
      </div>
      <div className="space-y-2 border-t border-border/70 pt-3">
        <p className="text-sm font-semibold text-foreground">Densité</p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={density === 'comfortable' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onDensityChange('comfortable')}
          >
            <Rows3 className="size-4" />
            Confort
          </Button>
          <Button
            type="button"
            variant={density === 'compact' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onDensityChange('compact')}
          >
            <Rows3 className="size-4" />
            Compact
          </Button>
        </div>
      </div>
    </PopoverContent>
  </Popover>
);

export default DirectoryTableViewOptions;
