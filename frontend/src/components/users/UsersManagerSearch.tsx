import { Input } from '@/components/ui/input';

type UsersManagerSearchProps = {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
};

const UsersManagerSearch = ({ searchTerm, onSearchTermChange }: UsersManagerSearchProps) => (
  <div className="flex items-center gap-2">
    <Input
      type="text"
      value={searchTerm}
      onChange={(event) => onSearchTermChange(event.target.value)}
      placeholder="Rechercher un utilisateur\u2026"
    />
  </div>
);

export default UsersManagerSearch;
