import { Input } from '@/components/ui/input';

type AgenciesManagerSearchProps = {
  value: string;
  onChange: (value: string) => void;
};

const AgenciesManagerSearch = ({ value, onChange }: AgenciesManagerSearchProps) => {
  return (
    <div className="flex items-center gap-2" data-testid="admin-agencies-search">
      <Input
        id="admin-agencies-search-input"
        name="admin-agencies-search"
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label="Rechercher une agence"
        placeholder="Rechercher une agence..."
        data-testid="admin-agencies-search-input"
      />
    </div>
  );
};

export default AgenciesManagerSearch;
