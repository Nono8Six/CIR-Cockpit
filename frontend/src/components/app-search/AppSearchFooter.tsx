import type { ReactNode } from 'react';

import { APP_SEARCH_SCOPE_PREFIXES } from '@/app/useAppSearchData';
import { Kbd } from '../ui/data-display/Kbd';

type AppSearchFooterProps = {
  footerLeft?: ReactNode;
  footerRight?: ReactNode;
};

const PREFIX_LEGEND: Array<{ prefix: string; label: string }> = [
  { prefix: APP_SEARCH_SCOPE_PREFIXES.commands, label: 'commandes' },
  { prefix: APP_SEARCH_SCOPE_PREFIXES.contacts, label: 'contacts' },
  { prefix: APP_SEARCH_SCOPE_PREFIXES.interactions, label: 'interactions' },
  { prefix: APP_SEARCH_SCOPE_PREFIXES.clients, label: 'clients' }
];

const AppSearchFooter = ({ footerLeft, footerRight }: AppSearchFooterProps) => (
  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 px-3 py-2 text-[11px] text-muted-foreground">
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1" data-testid="app-search-prefix-legend">
      {footerLeft ?? PREFIX_LEGEND.map((entry) => (
        <span key={entry.prefix} className="inline-flex items-center gap-1">
          <Kbd className="text-[11px]">{entry.prefix}</Kbd>{' '}{entry.label}
        </span>
      ))}
    </span>
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {footerRight ?? (
        <>
          <span className="inline-flex items-center gap-1"><Kbd className="text-[11px]">↑↓</Kbd> naviguer</span>
          <span className="inline-flex items-center gap-1"><Kbd className="text-[11px]">↵</Kbd> ouvrir</span>
          <span className="inline-flex items-center gap-1"><Kbd className="text-[11px]">Échap</Kbd> fermer</span>
        </>
      )}
    </span>
  </div>
);

export default AppSearchFooter;
