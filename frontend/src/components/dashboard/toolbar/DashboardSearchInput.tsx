import { forwardRef } from 'react';
import { Search } from 'lucide-react';

import { Input } from '../../ui/inputs/basic/Input';

type DashboardSearchInputProps = {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
};

const DashboardSearchInput = forwardRef<HTMLInputElement, DashboardSearchInputProps>(
  ({ searchTerm, onSearchTermChange }, ref) => (
    <div className="group relative w-full">
      <Search
        size={14}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/80 transition-colors group-focus-within:text-primary"
        aria-hidden="true"
      />
      <Input
        ref={ref}
        data-testid="dashboard-search-input"
        type="text"
        value={searchTerm}
        onChange={(event) => onSearchTermChange(event.target.value)}
        placeholder="Filtrer par nom, sujet ou référence…"
        className="h-8 border-border bg-card pl-9 pr-10 text-xs shadow-soft transition-[border-color,box-shadow] duration-150 focus-visible:border-primary/40 focus-visible:ring-1 focus-visible:ring-primary/40"
        aria-label="Filtrer les interactions"
        autoComplete="off"
        name="dashboard-search"
      />
      <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 select-none rounded border border-border bg-surface-1 px-1.5 py-0.5 font-mono text-[9px] font-medium text-muted-foreground transition-opacity duration-150 group-focus-within:opacity-0">
        /
      </kbd>
    </div>
  )
);

DashboardSearchInput.displayName = 'DashboardSearchInput';

export default DashboardSearchInput;
