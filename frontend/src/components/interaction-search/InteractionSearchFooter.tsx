type InteractionSearchFooterProps = {
  createLabel?: string;
  createDisabled?: boolean;
  onCreateEntity?: () => void;
  onOpenGlobalSearch?: () => void;
};

const InteractionSearchFooter = ({
  createLabel,
  createDisabled = false,
  onCreateEntity,
  onOpenGlobalSearch
}: InteractionSearchFooterProps) => {
  if (!createLabel && !onOpenGlobalSearch) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
      {createLabel ? (
        <button
          type="button"
          onClick={onCreateEntity}
          disabled={createDisabled || !onCreateEntity}
          className="font-semibold text-primary transition-colors hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:text-muted-foreground/60"
        >
          {createLabel}
        </button>
      ) : (
        <span />
      )}
      {onOpenGlobalSearch && (
        <button
          type="button"
          onClick={onOpenGlobalSearch}
          className="text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
        >
          <span className="sm:hidden">Voir tout</span>
          <span className="hidden sm:inline">Voir tout (Ctrl+K)</span>
        </button>
      )}
    </div>
  );
};

export default InteractionSearchFooter;
