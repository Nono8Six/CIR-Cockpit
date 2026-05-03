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
    placeholder="Rechercher entité, contact, n° client, téléphone…"
    value={query}
    onValueChange={onQueryChange}
    autoComplete="off"
    ref={inputRef}
    className="h-10 text-[13px]"
  />
);

export default InteractionSearchInput;
