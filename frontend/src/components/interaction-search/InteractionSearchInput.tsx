import type { Ref } from 'react';

import { CommandInput } from '@/components/ui/command';

type InteractionSearchInputProps = {
  query: string;
  onQueryChange: (value: string) => void;
  inputRef?: Ref<HTMLInputElement>;
};

const InteractionSearchInput = ({
  query,
  onQueryChange,
  inputRef
}: InteractionSearchInputProps) => (
  <CommandInput
    placeholder="Rechercher entite, contact, numero, telephone..."
    value={query}
    onValueChange={onQueryChange}
    autoComplete="off"
    ref={inputRef}
    className="h-8 text-[12px]"
  />
);

export default InteractionSearchInput;
