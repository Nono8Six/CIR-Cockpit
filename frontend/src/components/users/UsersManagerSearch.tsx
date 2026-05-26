import { Search } from 'lucide-react';
import { Input } from '../ui/inputs/basic/Input';

type UsersManagerSearchProps = {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
};

const UsersManagerSearch = ({ searchTerm, onSearchTermChange }: UsersManagerSearchProps) => (
  <div className="flex items-center gap-2" data-testid="admin-users-search">
    <div className="relative flex-1">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70" size={15} />
      <Input
        id="admin-users-search-input"
        name="admin-users-search"
        type="text"
        value={searchTerm}
        onChange={(event) => onSearchTermChange(event.target.value)}
        aria-label="Rechercher un utilisateur"
        placeholder="Rechercher un utilisateur par nom, prénom ou email..."
        className="pl-9 h-10 rounded-xl bg-muted/10 border-border/60 focus-visible:ring-primary/20 hover:bg-background/50 hover:border-border/80 transition-all duration-200"
        data-testid="admin-users-search-input"
      />
    </div>
  </div>
);

export default UsersManagerSearch;
