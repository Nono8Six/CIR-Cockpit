import { Search } from 'lucide-react';

type AppHeaderSearchButtonProps = {
  onOpenSearch: () => void;
};

const AppHeaderSearchButton = ({ onOpenSearch }: AppHeaderSearchButtonProps) => (
  <button
    type="button"
    data-testid="app-header-search-button"
    className="group inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:border-cir-red/40 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cir-red/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white lg:h-9 lg:w-auto lg:min-w-[12rem] lg:justify-start lg:gap-3 lg:px-3"
    onClick={onOpenSearch}
    aria-label="Ouvrir la recherche rapide"
  >
    <Search size={14} className="shrink-0 group-hover:text-slate-700" />
    <span
      data-testid="app-header-search-label"
      className="hidden text-xs font-medium text-slate-400 group-hover:text-slate-600 lg:inline"
    >
      Recherche rapide…
    </span>
    <span className="ml-auto hidden items-center gap-1 lg:inline-flex">
      <span className="text-xs bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 font-mono text-slate-500">
        ⌘{"\u00A0"}K
      </span>
    </span>
  </button>
);

export default AppHeaderSearchButton;
