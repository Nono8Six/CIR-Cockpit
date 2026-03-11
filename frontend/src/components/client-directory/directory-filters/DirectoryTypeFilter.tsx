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

      <div className="hidden xl:flex xl:flex-col xl:gap-1">
        <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
          Type de fiche
        </p>
        <ToggleGroup
          type="single"
          value={value}
          variant="outline"
          size="sm"
          spacing={1}
          aria-label="Type de fiche"
          className="justify-start"
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
              className="h-9 min-w-[78px] rounded-lg border-border/70 px-3 text-sm font-medium shadow-none data-[state=on]:border-primary/40 data-[state=on]:bg-primary/5 data-[state=on]:text-foreground data-[state=on]:hover:bg-primary/10"
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
