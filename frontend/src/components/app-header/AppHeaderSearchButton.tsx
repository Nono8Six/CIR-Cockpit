import { Search } from 'lucide-react';

type AppHeaderSearchButtonProps = {
  onOpenSearch: () => void;
};

const AppHeaderSearchButton = ({ onOpenSearch }: AppHeaderSearchButtonProps) => (
  <button
    type="button"
    className="flex items-center bg-white border border-slate-200 rounded-md px-3 py-1.5 hover:bg-slate-50 hover:border-cir-red/40 transition-colors gap-3 text-slate-500 w-10 sm:w-44 md:w-60 shadow-sm group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cir-red/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
    onClick={onOpenSearch}
    aria-label="Ouvrir la recherche rapide"
  >
    <Search size={14} className="group-hover:text-slate-700" />
    <span className="text-xs text-slate-400 font-medium hidden sm:inline group-hover:text-slate-600">
      Recherche rapide…
    </span>
    <span className="ml-auto hidden md:flex items-center gap-1">
      <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 font-mono text-slate-500">
        ⌘{"\u00A0"}K
      </span>
    </span>
  </button>
);

export default AppHeaderSearchButton;
