import { forwardRef } from 'react';
import { Search } from 'lucide-react';

import { Input } from '../../ui/inputs/basic/Input';

type DashboardSearchInputProps = {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
};

/**
 * Custom search/filter input component with a keyboard shortcut visual indicator.
 * Filters the Kanban board interactions on the fly.
 * 
 * @param {DashboardSearchInputProps} props - The component props.
 * @returns {React.JSX.Element} The rendered search input.
 */
const DashboardSearchInput = forwardRef<HTMLInputElement, DashboardSearchInputProps>(
  ({ searchTerm, onSearchTermChange }, ref) => (
    <div className="group relative w-full">
      <Search
        size={14}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 transition-colors group-focus-within:text-primary"
        aria-hidden="true"
      />
      <Input
        ref={ref}
        data-testid="dashboard-search-input"
        type="text"
        value={searchTerm}
        onChange={(event) => onSearchTermChange(event.target.value)}
        placeholder="Filtrer par nom, sujet ou référence…"
        className="h-8 rounded-lg border border-border bg-card pl-9 pr-10 text-[12.5px] shadow-soft transition-all duration-200 hover:border-border/80 focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/10"
        aria-label="Filtrer les interactions"
        autoComplete="off"
        name="dashboard-search"
      />
      <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 select-none rounded border border-border bg-surface-1 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-muted-foreground/80 shadow-soft transition-opacity duration-150 group-focus-within:opacity-0">
        /
      </kbd>
    </div>
  )
);

DashboardSearchInput.displayName = 'DashboardSearchInput';

export default DashboardSearchInput;
