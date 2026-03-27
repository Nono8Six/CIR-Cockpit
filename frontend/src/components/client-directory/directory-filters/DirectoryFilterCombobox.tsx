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
  triggerAriaLabel?: string;
  multiple?: boolean;
  disabled?: boolean;
  className?: string;
}

interface DirectoryFilterComboboxContentProps {
  items: DirectoryFilterOption[];
  values: string[];
  onValuesChange: (values: string[]) => void;
  allLabel: string;
  searchPlaceholder: string;
  emptyLabel: string;
  searchInputName?: string;
  multiple?: boolean;
  onRequestClose?: () => void;
}

const normalizeValue = (value: string): string => value.trim().toLowerCase();

const getSelectedItems = (items: DirectoryFilterOption[], values: string[]) =>
  items.filter((item) => values.includes(item.value));

export const getDirectoryFilterTriggerLabel = ({
  items,
  values,
  placeholder,
  multiple = false,
  selectionSummaryLabel
}: Pick<
  DirectoryFilterComboboxProps,
  'items' | 'values' | 'placeholder' | 'multiple' | 'selectionSummaryLabel'
>): string => {
  const selectedItems = getSelectedItems(items, values);

  if (selectedItems.length === 0) {
    return placeholder;
  }

  if (!multiple || selectedItems.length === 1) {
    return selectedItems[0]?.label ?? placeholder;
  }

  if (selectedItems.length === 2) {
    return `${selectedItems[0]?.label ?? placeholder} +1`;
  }

  return `${selectedItems.length} ${selectionSummaryLabel ?? 'selections'}`;
};

export const DirectoryFilterComboboxContent = ({
  items,
  values,
  onValuesChange,
  allLabel,
  searchPlaceholder,
  emptyLabel,
  searchInputName,
  multiple = false,
  onRequestClose
}: DirectoryFilterComboboxContentProps) => {
  const [query, setQuery] = useState('');

  const filteredItems = useMemo(() => {
    const normalizedQuery = normalizeValue(query);
    if (!normalizedQuery) {
      return items;
    }

    return items.filter((item) => normalizeValue(item.label).includes(normalizedQuery));
  }, [items, query]);

  const toggleValue = (nextValue: string) => {
    if (!multiple) {
      onValuesChange([nextValue]);
      onRequestClose?.();
      return;
    }

    const nextValues = values.includes(nextValue)
      ? values.filter((value) => value !== nextValue)
      : [...values, nextValue];

    onValuesChange(nextValues);
  };

  return (
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
              onRequestClose?.();
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
  );
};

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
  triggerAriaLabel,
  multiple = false,
  disabled = false,
  className
}: DirectoryFilterComboboxProps) => {
  const [open, setOpen] = useState(false);
  const selectedItems = getSelectedItems(items, values);
  const triggerLabel = getDirectoryFilterTriggerLabel({
    items,
    values,
    placeholder,
    multiple,
    selectionSummaryLabel
  });

  const baseAriaLabel = triggerAriaLabel?.trim() || placeholder;
  const ariaLabel = selectedItems.length > 0
    ? `${baseAriaLabel} : ${selectedItems.map((item) => item.label).join(', ')}`
    : baseAriaLabel;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="dense"
          disabled={disabled}
          aria-label={ariaLabel}
          className={cn(
            'h-8 justify-between gap-1.5 rounded-full px-3 text-xs font-medium shadow-none transition-colors',
            selectedItems.length === 0
              ? 'border-dashed border-border/70 bg-transparent text-muted-foreground hover:bg-surface-1'
              : 'border-primary/30 bg-primary/5 text-foreground hover:bg-primary/10',
            className
          )}
        >
          {selectedItems.length === 0 ? <span className="mr-1 text-muted-foreground/60">+</span> : null}
          <span className="truncate text-left">
            {selectedItems.length > 0 ? (
              <span className="mr-1 font-semibold text-primary/90">
                {placeholder.replace('Toutes les ', '').replace('Tous les ', '').split(' ')[0]}:
              </span>
            ) : null}
            {triggerLabel === placeholder
              ? placeholder.replace('Toutes les ', '').replace('Tous les ', '')
              : triggerLabel}
          </span>
          <ChevronsUpDown className="size-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[--radix-popover-trigger-width] min-w-[260px] p-0">
        <DirectoryFilterComboboxContent
          items={items}
          values={values}
          onValuesChange={onValuesChange}
          allLabel={allLabel}
          searchPlaceholder={searchPlaceholder}
          emptyLabel={emptyLabel}
          searchInputName={searchInputName}
          multiple={multiple}
          onRequestClose={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
};

export default DirectoryFilterCombobox;
