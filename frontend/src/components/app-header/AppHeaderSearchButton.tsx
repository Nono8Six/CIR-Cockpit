import { Search } from 'lucide-react';

type AppHeaderSearchButtonProps = {
  onOpenSearch: () => void;
  onSearchIntent?: () => void;
};

const AppHeaderSearchButton = ({ onOpenSearch, onSearchIntent }: AppHeaderSearchButtonProps) => {
  const isApplePlatform = typeof navigator !== 'undefined'
    && /(Mac|iPhone|iPad|iPod)/i.test(navigator.platform);
  const shortcutLabel = isApplePlatform ? '⌘\u00A0K' : 'Ctrl+\u00A0K';

  const handleSearchIntent = () => {
    onSearchIntent?.();
  };

  return (
    <button
      type="button"
      data-testid="app-header-search-button"
      className="group inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:border-ring/40 hover:bg-surface-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:h-9 lg:w-auto lg:min-w-[12rem] lg:justify-start lg:gap-3 lg:px-3"
      onClick={onOpenSearch}
      onMouseEnter={handleSearchIntent}
      onFocus={handleSearchIntent}
      onPointerDown={handleSearchIntent}
      aria-label="Ouvrir la recherche rapide"
    >
      <Search size={14} className="shrink-0 group-hover:text-foreground" />
      <span
        data-testid="app-header-search-label"
        className="hidden text-xs font-medium text-muted-foreground group-hover:text-foreground lg:inline"
      >
        Recherche rapide…
      </span>
      <span className="ml-auto hidden items-center gap-1 lg:inline-flex">
        <span className="rounded border border-border/80 bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground/80">
          {shortcutLabel}
        </span>
      </span>
    </button>
  );
};

export default AppHeaderSearchButton;
