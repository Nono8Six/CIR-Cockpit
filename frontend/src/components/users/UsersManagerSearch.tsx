import { Search } from 'lucide-react';
import { Input } from '../ui/inputs/basic/Input';

type UsersManagerSearchProps = {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
};

const UsersManagerSearch = ({ searchTerm, onSearchTermChange }: UsersManagerSearchProps) => (
  <div className="flex shrink-0 items-center gap-2" data-testid="admin-users-search">
    <div className="relative w-full max-w-72">
      <Search
        className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        id="admin-users-search-input"
        name="admin-users-search"
        type="text"
        density="dense"
        value={searchTerm}
        onChange={(event) => onSearchTermChange(event.target.value)}
        aria-label="Rechercher un utilisateur"
        placeholder="Rechercher nom, prénom ou email…"
        className="border-border pl-8 text-xs"
        data-testid="admin-users-search-input"
      />
    </div>
  </div>
);

export default UsersManagerSearch;
