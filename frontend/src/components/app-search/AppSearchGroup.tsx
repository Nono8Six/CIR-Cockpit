import type { ReactNode } from 'react';

import { CommandGroup } from '../ui/inputs/selects/Command';

type AppSearchGroupProps = {
  heading: string;
  children: ReactNode;
};

/** En-tete de section unique pour toute la palette : 11 px, semi-gras, capitales espacees. */
const AppSearchGroup = ({ heading, children }: AppSearchGroupProps) => (
  <CommandGroup
    heading={heading}
    className="px-0 pb-1 pt-2 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-muted-foreground"
  >
    {children}
  </CommandGroup>
);

export default AppSearchGroup;
