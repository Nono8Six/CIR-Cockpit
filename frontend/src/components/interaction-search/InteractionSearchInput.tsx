import type { Ref } from 'react';

import { CommandInput } from '../ui/inputs/selects/Command';

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
    placeholder="Rechercher par nom, téléphone, email, n° client, SIRET…"
    value={query}
    onValueChange={onQueryChange}
    autoComplete="off"
    ref={inputRef}
    className="h-12 text-[14px] font-medium text-foreground placeholder:text-muted-foreground/75 transition-all duration-200"
  />
);

export default InteractionSearchInput;

