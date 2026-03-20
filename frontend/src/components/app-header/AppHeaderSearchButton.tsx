import { Search } from 'lucide-react';

import {
  getSearchShortcutLabel,
  SEARCH_SHORTCUT_ARIA
} from '@/app/appConstants';
import { Kbd } from '@/components/ui/kbd';

type AppHeaderSearchButtonProps = {
  onOpenSearch: () => void;
  onSearchIntent?: () => void;
};

const AppHeaderSearchButton = ({ onOpenSearch, onSearchIntent }: AppHeaderSearchButtonProps) => {
  const shortcutLabel = getSearchShortcutLabel();

  const handleSearchIntent = () => {
    onSearchIntent?.();
  };

  return (
    <button
      type="button"
      data-testid="app-header-search-button"
      className="group inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border/50 bg-muted/30 text-muted-foreground transition-[background-color,border-color,color,box-shadow] hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:h-9 lg:w-auto lg:min-w-[16rem] lg:justify-start lg:gap-3 lg:px-3"
      onClick={onOpenSearch}
      onMouseEnter={handleSearchIntent}
      onFocus={handleSearchIntent}
      onPointerDown={handleSearchIntent}
      aria-label="Ouvrir la recherche rapide"
      aria-keyshortcuts={SEARCH_SHORTCUT_ARIA}
    >
      <Search size={14} className="shrink-0 transition-colors group-hover:text-foreground" />
      <span
        data-testid="app-header-search-label"
        className="hidden text-xs font-medium transition-colors group-hover:text-foreground lg:inline"
      >
        Recherche rapide…
      </span>
      <span className="ml-auto hidden items-center lg:inline-flex">
        <Kbd className="group-hover:bg-background/80 group-hover:text-foreground transition-colors">{shortcutLabel}</Kbd>
      </span>
    </button>
  );
};

export default AppHeaderSearchButton;
