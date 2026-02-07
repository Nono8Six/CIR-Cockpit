import { Input } from '@/components/ui/input';

type AgenciesManagerSearchProps = {
  value: string;
  onChange: (value: string) => void;
};

const AgenciesManagerSearch = ({ value, onChange }: AgenciesManagerSearchProps) => {
  return (
    <div className="flex items-center gap-2">
      <Input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Rechercher une agence\u2026"
      />
    </div>
  );
};

export default AgenciesManagerSearch;
