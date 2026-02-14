import { Input } from '@/components/ui/input';

type UsersManagerSearchProps = {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
};

const UsersManagerSearch = ({ searchTerm, onSearchTermChange }: UsersManagerSearchProps) => (
  <div className="flex items-center gap-2" data-testid="admin-users-search">
    <Input
      type="text"
      value={searchTerm}
      onChange={(event) => onSearchTermChange(event.target.value)}
      placeholder="Rechercher un utilisateur..."
      data-testid="admin-users-search-input"
    />
  </div>
);

export default UsersManagerSearch;
