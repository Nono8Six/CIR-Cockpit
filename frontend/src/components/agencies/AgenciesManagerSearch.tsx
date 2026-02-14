import { Input } from '@/components/ui/input';

type AgenciesManagerSearchProps = {
  value: string;
  onChange: (value: string) => void;
};

const AgenciesManagerSearch = ({ value, onChange }: AgenciesManagerSearchProps) => {
  return (
    <div className="flex items-center gap-2" data-testid="admin-agencies-search">
      <Input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Rechercher une agence..."
        data-testid="admin-agencies-search-input"
      />
    </div>
  );
};

export default AgenciesManagerSearch;
