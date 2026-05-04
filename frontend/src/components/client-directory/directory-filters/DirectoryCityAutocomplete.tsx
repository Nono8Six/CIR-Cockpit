import { useDeferredValue, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Check } from 'lucide-react';
import type {
  DirectoryCitySuggestionsInput,
  DirectoryEntityType,
  DirectoryScopeInput
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
import { cn } from '@/lib/utils';

interface DirectoryCityAutocompleteProps {
  draftValue: string;
  committedValue: string | undefined;
  type: DirectoryEntityType;
  scope: DirectoryScopeInput;
  includeArchived: boolean;
  onDraftChange: (value: string) => void;
  onCommit: (value: string | undefined) => void;
  onCommitComplete?: () => void;
  className?: string;
}

const DirectoryCityAutocomplete = ({
  draftValue,
  committedValue,
  type,
  scope,
  includeArchived,
  onDraftChange,
  onCommit,
  onCommitComplete,
  className
}: DirectoryCityAutocompleteProps) => {
  const [open, setOpen] = useState(false);
  const isSelectingSuggestionRef = useRef(false);
  const deferredDraftValue = useDeferredValue(draftValue.trim());
  const normalizedCommittedValue = (committedValue ?? '').trim();

  const suggestionInput = useMemo<DirectoryCitySuggestionsInput>(() => ({
    q: deferredDraftValue,
    type,
    scope,
    includeArchived
  }), [deferredDraftValue, includeArchived, scope, type]);

  const suggestionsQuery = useDirectoryCitySuggestions(suggestionInput, open);
  const suggestions = suggestionsQuery.data?.cities ?? [];
  const shouldShowSuggestions = open && draftValue.trim().length >= 2;

  const commitValue = (nextValue: string | undefined) => {
    const normalizedValue = nextValue?.trim() ?? '';
    onDraftChange(normalizedValue);
    onCommit(normalizedValue || undefined);
    setOpen(false);
    onCommitComplete?.();
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
          onCommitComplete?.();
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
    <div className={cn('relative', className)}>
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
        className="h-9 rounded-lg border-border/70 shadow-none"
      />

      {shouldShowSuggestions ? (
        <div className="absolute left-0 top-[calc(100%+4px)] z-50 w-full overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md">
          <Command shouldFilter={false}>
            <CommandList>
              {suggestionsQuery.isFetching ? (
                <CommandLoading>Chargement des villes…</CommandLoading>
              ) : null}
              {!suggestionsQuery.isFetching && suggestions.length === 0 ? (
                <CommandEmpty>Aucune ville trouvee.</CommandEmpty>
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
        </div>
      ) : null}
    </div>
  );
};

export default DirectoryCityAutocomplete;
