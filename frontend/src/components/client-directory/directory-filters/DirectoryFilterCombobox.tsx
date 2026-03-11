import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { DirectoryFilterOption } from './DirectoryFilters.types';

interface DirectoryFilterComboboxProps {
  items: DirectoryFilterOption[];
  values: string[];
  onValuesChange: (values: string[]) => void;
  placeholder: string;
  allLabel: string;
  searchPlaceholder: string;
  emptyLabel: string;
  searchInputName?: string;
  selectionSummaryLabel?: string;
  multiple?: boolean;
  disabled?: boolean;
  className?: string;
}

const normalizeValue = (value: string): string => value.trim().toLowerCase();

const DirectoryFilterCombobox = ({
  items,
  values,
  onValuesChange,
  placeholder,
  allLabel,
  searchPlaceholder,
  emptyLabel,
  searchInputName,
  selectionSummaryLabel,
  multiple = false,
  disabled = false,
  className
}: DirectoryFilterComboboxProps) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filteredItems = useMemo(() => {
    const normalizedQuery = normalizeValue(query);
    if (!normalizedQuery) {
      return items;
    }

    return items.filter((item) => normalizeValue(item.label).includes(normalizedQuery));
  }, [items, query]);

  const selectedItems = items.filter((item) => values.includes(item.value));
  const triggerLabel = useMemo(() => {
    if (selectedItems.length === 0) {
      return placeholder;
    }

    if (!multiple || selectedItems.length === 1) {
      return selectedItems[0]?.label ?? placeholder;
    }

    if (selectedItems.length === 2) {
      return `${selectedItems[0]?.label ?? placeholder} +1`;
    }

    return `${selectedItems.length} ${selectionSummaryLabel ?? 'sélections'}`;
  }, [multiple, placeholder, selectedItems, selectionSummaryLabel]);

  const ariaLabel = selectedItems.length > 0
    ? `${placeholder} : ${selectedItems.map((item) => item.label).join(', ')}`
    : placeholder;

  const toggleValue = (nextValue: string) => {
    if (!multiple) {
      onValuesChange([nextValue]);
      setOpen(false);
      return;
    }

    const nextValues = values.includes(nextValue)
      ? values.filter((value) => value !== nextValue)
      : [...values, nextValue];

    onValuesChange(nextValues);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setQuery('');
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="dense"
          disabled={disabled}
          aria-label={ariaLabel}
          className={cn(
            'h-9 w-full justify-between gap-2 rounded-lg border-border/70 px-3 text-sm font-normal text-foreground shadow-none',
            selectedItems.length === 0 && 'text-muted-foreground',
            className
          )}
        >
          <span className="truncate text-left">{triggerLabel}</span>
          <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground/70" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[--radix-popover-trigger-width] min-w-[260px] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            name={searchInputName}
            value={query}
            onValueChange={setQuery}
            placeholder={searchPlaceholder}
            className="h-9"
          />
          <CommandList>
            <CommandItem
              value="__all__"
              onSelect={() => {
                onValuesChange([]);
                if (!multiple) {
                  setOpen(false);
                }
              }}
            >
              <span className="flex-1">{allLabel}</span>
              <Check className={cn('size-4 text-primary', values.length === 0 ? 'opacity-100' : 'opacity-0')} />
            </CommandItem>
            {filteredItems.length === 0 ? (
              <CommandEmpty>{emptyLabel}</CommandEmpty>
            ) : null}
            {filteredItems.map((item) => {
              const isSelected = values.includes(item.value);
              return (
                <CommandItem
                  key={item.value}
                  value={`${item.label} ${item.value}`}
                  onSelect={() => {
                    toggleValue(item.value);
                  }}
                >
                  <span className="flex-1 truncate">{item.label}</span>
                  <Check className={cn('size-4 text-primary', isSelected ? 'opacity-100' : 'opacity-0')} />
                </CommandItem>
              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default DirectoryFilterCombobox;
