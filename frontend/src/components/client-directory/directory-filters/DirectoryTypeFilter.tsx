import { type DirectoryEntityType } from 'shared/schemas/directory.schema';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';

const DIRECTORY_TYPES: Array<{ value: DirectoryEntityType; label: string }> = [
  { value: 'all', label: 'Tous' },
  { value: 'client', label: 'Clients' },
  { value: 'prospect', label: 'Prospects' }
];

interface DirectoryTypeFilterProps {
  value: DirectoryEntityType;
  onValueChange: (value: DirectoryEntityType) => void;
  className?: string;
}

const toDirectoryEntityType = (value: string): DirectoryEntityType =>
  DIRECTORY_TYPES.find((candidate) => candidate.value === value)?.value ?? 'all';

const DirectoryTypeFilter = ({
  value,
  onValueChange,
  className
}: DirectoryTypeFilterProps) => {
  const selectedLabel = DIRECTORY_TYPES.find((candidate) => candidate.value === value)?.label ?? 'Tous';

  return (
    <div className={cn('min-w-0', className)}>
      <div className="xl:hidden">
        <Select value={value} onValueChange={(nextValue) => onValueChange(toDirectoryEntityType(nextValue))}>
          <SelectTrigger
            density="comfortable"
            aria-label="Type de fiche"
            className="h-9 min-w-[148px] shrink-0 rounded-lg border-border/70 px-3 text-sm shadow-none"
          >
            <span className="truncate">{`Type : ${selectedLabel}`}</span>
          </SelectTrigger>
          <SelectContent>
            {DIRECTORY_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="hidden xl:flex xl:flex-col xl:gap-1.5">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
          AFFICHAGE
        </p>
        <ToggleGroup
          type="single"
          value={value}
          variant="outline"
          size="sm"
          spacing={1}
          aria-label="Type de fiche"
          className="inline-flex h-8 items-center justify-start rounded-md bg-muted/50 p-1"
          onValueChange={(nextValue) => {
            if (!nextValue) {
              return;
            }

            onValueChange(toDirectoryEntityType(nextValue));
          }}
        >
          {DIRECTORY_TYPES.map((type) => (
            <ToggleGroupItem
              key={type.value}
              value={type.value}
              aria-label={type.label}
              className="h-6 rounded-sm border-0 px-3 text-xs font-medium text-muted-foreground transition-all hover:bg-muted hover:text-foreground data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm"
            >
              {type.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
    </div>
  );
};

export default DirectoryTypeFilter;
