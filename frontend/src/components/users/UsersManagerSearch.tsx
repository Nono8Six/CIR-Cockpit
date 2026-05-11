import { Input } from '@/components/ui/input';

type UsersManagerSearchProps = {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
};

const UsersManagerSearch = ({ searchTerm, onSearchTermChange }: UsersManagerSearchProps) => (
  <div className="flex items-center gap-2" data-testid="admin-users-search">
    <Input
      id="admin-users-search-input"
      name="admin-users-search"
      type="text"
      value={searchTerm}
      onChange={(event) => onSearchTermChange(event.target.value)}
      aria-label="Rechercher un utilisateur"
      placeholder="Rechercher un utilisateur..."
      data-testid="admin-users-search-input"
    />
  </div>
);

export default UsersManagerSearch;
