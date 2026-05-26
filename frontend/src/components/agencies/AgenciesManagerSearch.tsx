import { Search } from 'lucide-react';
import { Input } from '../ui/inputs/basic/Input';

type AgenciesManagerSearchProps = {
  value: string;
  onChange: (value: string) => void;
};

const AgenciesManagerSearch = ({ value, onChange }: AgenciesManagerSearchProps) => {
  return (
    <div className="flex items-center gap-2" data-testid="admin-agencies-search">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70" size={15} />
        <Input
          id="admin-agencies-search-input"
          name="admin-agencies-search"
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-label="Rechercher une agence"
          placeholder="Rechercher une agence par nom..."
          className="pl-9 h-10 rounded-xl bg-muted/20 border-border/70 focus-visible:ring-primary/20"
          data-testid="admin-agencies-search-input"
        />
      </div>
    </div>
  );
};

export default AgenciesManagerSearch;
