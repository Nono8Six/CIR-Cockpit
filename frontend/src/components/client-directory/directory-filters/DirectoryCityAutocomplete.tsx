import { useDeferredValue, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Check } from 'lucide-react';
import type {
  DirectoryCitySuggestionsInput,
  DirectoryEntityType
} from 'shared/schemas/directory.schema';

import { useDirectoryCitySuggestions } from '@/hooks/useDirectoryCitySuggestions';
import {
  Command,
  CommandEmpty,
  CommandItem,
  CommandList,
  CommandLoading
} from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverAnchor,
  PopoverContent
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface DirectoryCityAutocompleteProps {
  draftValue: string;
  committedValue: string | undefined;
  type: DirectoryEntityType;
  agencyIds: string[];
  includeArchived: boolean;
  onDraftChange: (value: string) => void;
  onCommit: (value: string | undefined) => void;
}

const DirectoryCityAutocomplete = ({
  draftValue,
  committedValue,
  type,
  agencyIds,
  includeArchived,
  onDraftChange,
  onCommit
}: DirectoryCityAutocompleteProps) => {
  const [open, setOpen] = useState(false);
  const isSelectingSuggestionRef = useRef(false);
  const deferredDraftValue = useDeferredValue(draftValue.trim());
  const normalizedCommittedValue = (committedValue ?? '').trim();

  const suggestionInput = useMemo<DirectoryCitySuggestionsInput>(() => ({
    q: deferredDraftValue,
    type,
    agencyIds,
    includeArchived
  }), [agencyIds, deferredDraftValue, includeArchived, type]);

  const suggestionsQuery = useDirectoryCitySuggestions(suggestionInput, open);
  const suggestions = suggestionsQuery.data?.cities ?? [];
  const shouldShowSuggestions = open && draftValue.trim().length >= 2;

  const commitValue = (nextValue: string | undefined) => {
    const normalizedValue = nextValue?.trim() ?? '';
    onDraftChange(normalizedValue);
    onCommit(normalizedValue || undefined);
    setOpen(false);
  };

  const restoreCommittedValue = () => {
    onDraftChange(normalizedCommittedValue);
    setOpen(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      commitValue(draftValue);
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      restoreCommittedValue();
    }
  };

  const handleBlur = () => {
    window.setTimeout(() => {
      if (isSelectingSuggestionRef.current) {
        isSelectingSuggestionRef.current = false;
        return;
      }

      const normalizedDraftValue = draftValue.trim();
      if (normalizedDraftValue.length === 0) {
        if (committedValue !== undefined) {
          onCommit(undefined);
        }
        onDraftChange('');
        setOpen(false);
        return;
      }

      if (normalizedDraftValue !== normalizedCommittedValue) {
        restoreCommittedValue();
        return;
      }

      setOpen(false);
    }, 0);
  };

  return (
    <Popover open={shouldShowSuggestions} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <Input
          value={draftValue}
          onChange={(event) => {
            const nextValue = event.target.value;
            onDraftChange(nextValue);
            setOpen(nextValue.trim().length >= 2);
          }}
          onFocus={() => {
            if (draftValue.trim().length >= 2) {
              setOpen(true);
            }
          }}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder="Saisir une ville…"
          aria-label="Filtre ville"
          name="directory-city"
          autoComplete="off"
          spellCheck={false}
        />
      </PopoverAnchor>
      <PopoverContent
        align="start"
        className="w-[320px] p-0"
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        <Command shouldFilter={false}>
          <CommandList>
            {suggestionsQuery.isFetching ? (
              <CommandLoading>Chargement des villes…</CommandLoading>
            ) : null}
            {!suggestionsQuery.isFetching && suggestions.length === 0 ? (
              <CommandEmpty>Aucune ville trouvée.</CommandEmpty>
            ) : null}
            {suggestions.map((suggestion) => {
              const isSelected = suggestion.value === (committedValue ?? '');
              return (
                <CommandItem
                  key={suggestion.value}
                  value={suggestion.value}
                  onMouseDown={() => {
                    isSelectingSuggestionRef.current = true;
                  }}
                  onSelect={() => {
                    commitValue(suggestion.value);
                  }}
                >
                  <span className="flex-1">{suggestion.label}</span>
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

export default DirectoryCityAutocomplete;
