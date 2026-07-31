import type { ReactNode } from 'react';

import { APP_SEARCH_SCOPE_PREFIXES } from '@/app/useAppSearchData';
import { Kbd } from '../ui/data-display/Kbd';

type AppSearchFooterProps = {
  /** La legende des prefixes n'apparait qu'a l'ouverture : c'est le moment de la decouverte. */
  showPrefixLegend: boolean;
  footerLeft?: ReactNode;
  footerRight?: ReactNode;
};

const PREFIX_LEGEND: Array<{ prefix: string; label: string }> = [
  { prefix: APP_SEARCH_SCOPE_PREFIXES.contacts, label: 'contacts' },
  { prefix: APP_SEARCH_SCOPE_PREFIXES.interactions, label: 'interactions' },
  { prefix: APP_SEARCH_SCOPE_PREFIXES.clients, label: 'clients' },
  { prefix: APP_SEARCH_SCOPE_PREFIXES.commands, label: 'commandes' }
];

const Hint = ({ keys, children }: { keys: string; children: ReactNode }) => (
  <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
    <Kbd className="text-[11px]">{keys}</Kbd>{' '}{children}
  </span>
);

const AppSearchFooter = ({ showPrefixLegend, footerLeft, footerRight }: AppSearchFooterProps) => (
  <div className="flex items-center justify-between gap-4 px-3 py-2 text-[11px] text-muted-foreground">
    <span
      className="flex min-w-0 items-center gap-3 overflow-x-auto hide-scrollbar"
      data-testid="app-search-prefix-legend"
    >
      {footerLeft ?? (showPrefixLegend
        ? PREFIX_LEGEND.map((entry) => (
          <Hint key={entry.prefix} keys={entry.prefix}>{entry.label}</Hint>
        ))
        : <Hint keys="↵">ouvrir</Hint>)}
    </span>
    <span className="flex shrink-0 items-center gap-3">
      {footerRight ?? (
        <>
          <Hint keys="↑↓">naviguer</Hint>
          <Hint keys="Échap">fermer</Hint>
        </>
      )}
    </span>
  </div>
);

export default AppSearchFooter;
