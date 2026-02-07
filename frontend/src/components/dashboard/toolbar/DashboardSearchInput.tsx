import { Search } from 'lucide-react';

type DashboardSearchInputProps = {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
};

const DashboardSearchInput = ({ searchTerm, onSearchTermChange }: DashboardSearchInputProps) => {
  return (
    <div className="relative w-full md:w-64 group">
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-600 transition-colors" />
      <input
        type="text"
        placeholder="Filtrer par nom, sujet, ref..."
        className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-md text-sm focus:ring-1 focus:ring-slate-300 focus:border-slate-300 focus:outline-none"
        value={searchTerm}
        onChange={(event) => onSearchTermChange(event.target.value)}
        aria-label="Filtrer les interactions"
        autoComplete="off"
        name="dashboard-search"
      />
    </div>
  );
};

export default DashboardSearchInput;
