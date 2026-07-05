import { Search } from 'lucide-react';

import {
  getSearchShortcutLabel,
  SEARCH_SHORTCUT_ARIA
} from '@/app/appConstants';
import { APP_SHELL_CLASSES } from '@/components/app-shell/appShellTokens';
import { Kbd } from '../ui/data-display/Kbd';
import { cn } from '@/lib/utils';

type AppHeaderSearchButtonProps = {
  onOpenSearch: () => void;
  onSearchIntent?: () => void;
  isCompact?: boolean;
};

/**
 * Button component for triggering the global search overlay.
 * Supports a compact mode for dashboard layout where vertical space and duplication is minimized.
 * 
 * @param {AppHeaderSearchButtonProps} props - The component props.
 * @returns {React.JSX.Element} The rendered search button.
 */
const AppHeaderSearchButton = ({ onOpenSearch, onSearchIntent, isCompact = false }: AppHeaderSearchButtonProps) => {
  const shortcutLabel = getSearchShortcutLabel();

  const handleSearchIntent = () => {
    onSearchIntent?.();
  };

  return (
    <button
      type="button"
      data-testid="app-header-search-button"
      className={cn(
        'group inline-flex min-w-0 shrink-0 items-center justify-center',
        APP_SHELL_CLASSES.control,
        !isCompact && 'lg:w-[17.5rem] lg:justify-start lg:gap-2 lg:px-2.5'
      )}
      onClick={onOpenSearch}
      onMouseEnter={handleSearchIntent}
      onFocus={handleSearchIntent}
      onPointerDown={handleSearchIntent}
      aria-label="Ouvrir la recherche rapide"
      aria-keyshortcuts={SEARCH_SHORTCUT_ARIA}
    >
      <Search size={14} className="shrink-0 transition-colors group-hover:text-foreground" />
      {!isCompact && (
        <>
          <span
            data-testid="app-header-search-label"
            className="hidden min-w-0 truncate text-xs font-medium transition-colors duration-150 group-hover:text-foreground lg:inline"
          >
            Clients, devis, interactions…
          </span>
          <span className="ml-auto hidden items-center lg:inline-flex">
            <Kbd className="transition-colors duration-150 group-hover:bg-background/80 group-hover:text-foreground">{shortcutLabel}</Kbd>
          </span>
        </>
      )}
    </button>
  );
};

export default AppHeaderSearchButton;
