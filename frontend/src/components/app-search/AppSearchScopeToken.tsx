import { X } from 'lucide-react';

import type { AppSearchScope } from '@/app/useAppSearchData';

export const APP_SEARCH_SCOPE_LABELS: Record<Exclude<AppSearchScope, 'all'>, string> = {
  commands: 'Commandes',
  contacts: 'Contacts',
  interactions: 'Interactions',
  clients: 'Clients'
};

type AppSearchScopeTokenProps = {
  scope: Exclude<AppSearchScope, 'all'>;
  onClear: () => void;
};

/**
 * Le perimetre actif vit dans le champ, la ou se trouve la requete, et non dans
 * une rangee de chips separee : un seul endroit a regarder, 40 px de moins.
 */
const AppSearchScopeToken = ({ scope, onClear }: AppSearchScopeTokenProps) => (
  <span
    className="inline-flex shrink-0 items-center gap-1 rounded-md border border-primary/25 bg-primary/10 py-0.5 pl-2 pr-1 text-[11px] font-medium text-foreground"
    data-testid="app-search-scope-token"
  >
    {APP_SEARCH_SCOPE_LABELS[scope]}
    <button
      type="button"
      onClick={onClear}
      aria-label={`Retirer le filtre ${APP_SEARCH_SCOPE_LABELS[scope]}`}
      className="rounded-sm p-0.5 text-muted-foreground transition-colors hover:bg-primary/15 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
    >
      <X className="size-3" aria-hidden="true" />
    </button>
  </span>
);

export default AppSearchScopeToken;
