import { Search } from 'lucide-react';

import { Input } from '@/components/ui/input';

type DashboardSearchInputProps = {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
};

const DashboardSearchInput = ({
  searchTerm,
  onSearchTermChange
}: DashboardSearchInputProps) => (
  <div className="relative w-full">
    <Search
      size={14}
      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
      aria-hidden="true"
    />
    <Input
      data-testid="dashboard-search-input"
      type="text"
      value={searchTerm}
      onChange={(event) => onSearchTermChange(event.target.value)}
      placeholder="Filtrer par nom, sujet ou reference..."
      className="h-9 border-slate-200 bg-slate-50 pl-9 text-sm"
      aria-label="Filtrer les interactions"
      autoComplete="off"
      name="dashboard-search"
    />
  </div>
);

export default DashboardSearchInput;
