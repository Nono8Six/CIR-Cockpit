import { Check, CirclePlus, X } from 'lucide-react';

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator
} from '@/components/ui/inputs/selects/Command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/navigation/Popover';
import { cn } from '@/lib/utils';
import { formatCount } from '../../utils/pricing-references-formatters';

export interface FacetedFilterOption {
  value: string;
  label: string;
  count: number;
  dotClassName?: string;
}

interface FacetedFilterProps {
  label: string;
  options: FacetedFilterOption[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
}

const MAX_VISIBLE_CHIPS = 2;

const triggerFocusClassName =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/45';

/**
 * Generic multi-select facet button (shadcn Tasks pattern): dashed trigger with a
 * plus icon when idle, solid border with value chips and a reset cross when active.
 * Options open in a Popover + Command list with checkboxes and mono counters.
 */
export const FacetedFilter = ({ label, options, selectedValues, onChange }: FacetedFilterProps) => {
  const isActive = selectedValues.length > 0;
  const selectedChips = selectedValues.map(
    (value) => options.find((option) => option.value === value)?.label ?? value
  );
  const visibleChips = selectedChips.slice(0, MAX_VISIBLE_CHIPS);
  const hiddenChipCount = selectedChips.length - visibleChips.length;

  const toggleValue = (value: string) => {
    onChange(
      selectedValues.includes(value)
        ? selectedValues.filter((selected) => selected !== value)
        : [...selectedValues, value]
    );
  };

  const triggerLabel = (
    <span className="flex items-center gap-1.5">
      <span className="whitespace-nowrap">{label}</span>
      {isActive ? (
        <span className="flex items-center gap-1">
          {visibleChips.map((chip) => (
            <span
              key={chip}
              className="whitespace-nowrap rounded bg-surface-3 px-1.5 text-[11px] text-stone-700"
            >
              {chip}
            </span>
          ))}
          {hiddenChipCount > 0 ? (
            <span className="whitespace-nowrap rounded bg-surface-3 px-1.5 font-mono text-[11px] tabular-nums text-stone-700">
              +{hiddenChipCount}
            </span>
          ) : null}
        </span>
      ) : null}
    </span>
  );

  return (
    <Popover>
      {isActive ? (
        <span className="inline-flex h-7 items-stretch overflow-hidden rounded-md border border-stone-300 bg-white">
          <button
            type="button"
            aria-label={`Réinitialiser le filtre ${label}`}
            onClick={() => onChange([])}
            className={cn(
              'inline-flex items-center border-r border-stone-200/60 px-1.5 text-stone-400 transition-colors hover:bg-stone-50 hover:text-stone-700',
              triggerFocusClassName
            )}
          >
            <X className="size-3" aria-hidden="true" />
          </button>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                'inline-flex items-center px-2 text-xs text-stone-700 transition-colors hover:bg-stone-50',
                triggerFocusClassName
              )}
            >
              {triggerLabel}
            </button>
          </PopoverTrigger>
        </span>
      ) : (
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              'inline-flex h-7 items-center gap-1.5 rounded-md border border-dashed border-stone-300 px-2.5 text-xs text-stone-600 transition-colors hover:border-stone-400 hover:text-stone-900',
              triggerFocusClassName
            )}
          >
            <CirclePlus className="size-[13px] text-stone-400" aria-hidden="true" />
            {triggerLabel}
          </button>
        </PopoverTrigger>
      )}
      <PopoverContent align="start" className="w-56 rounded-lg border-stone-200/60 p-0 shadow-md">
        <Command>
          <CommandInput placeholder={`Filtrer ${label.toLowerCase()}…`} className="h-8 text-xs" />
          <CommandList>
            <CommandEmpty className="py-6 text-center text-xs text-muted-foreground">
              Aucune option correspondante.
            </CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = selectedValues.includes(option.value);
                return (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() => toggleValue(option.value)}
                    className="gap-2 text-xs"
                  >
                    <span
                      className={cn(
                        'flex size-3.5 shrink-0 items-center justify-center rounded-[4px] border border-stone-300 transition-colors',
                        isSelected && 'border-primary bg-primary text-primary-foreground'
                      )}
                      aria-hidden="true"
                    >
                      {isSelected ? <Check className="!size-2.5" /> : null}
                    </span>
                    {option.dotClassName ? (
                      <span
                        className={cn('size-1.5 shrink-0 rounded-full', option.dotClassName)}
                        aria-hidden="true"
                      />
                    ) : null}
                    <span className="min-w-0 flex-1 truncate">{option.label}</span>
                    <span className="ml-auto font-mono text-[11px] tabular-nums text-stone-400">
                      {formatCount(option.count)}
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {isActive ? (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    value={`reinitialiser-${label}`}
                    onSelect={() => onChange([])}
                    className="justify-center text-xs text-stone-500"
                  >
                    Réinitialiser le filtre
                  </CommandItem>
                </CommandGroup>
              </>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
