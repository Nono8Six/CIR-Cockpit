import { Command } from 'lucide-react';

type AppSearchHeaderProps = {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onClose: () => void;
};

const AppSearchHeader = ({ searchQuery, onSearchQueryChange, onClose }: AppSearchHeaderProps) => (
  <div className="p-4 border-b border-slate-100 flex items-center gap-3">
    <Command className="text-slate-400" size={18} />
    <input
      autoFocus
      type="text"
      placeholder="Rechercher un client, une commande, un téléphone…"
      className="flex-1 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cir-red/30 text-slate-800 placeholder:text-slate-400 font-medium bg-transparent rounded-md"
      value={searchQuery}
      onChange={(event) => onSearchQueryChange(event.target.value)}
      aria-label="Rechercher"
      name="global-search"
      autoComplete="off"
    />
    <button
      type="button"
      onClick={onClose}
      className="text-slate-400 hover:text-slate-600 bg-slate-100 rounded-sm p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cir-red/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
      aria-label="Fermer la recherche"
    >
      <span className="text-xs font-mono">ESC</span>
    </button>
  </div>
);

export default AppSearchHeader;
