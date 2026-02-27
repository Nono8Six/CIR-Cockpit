type InteractionSearchFooterProps = {
  entityHeading: string;
  onCreateEntity?: () => void;
  onOpenGlobalSearch?: () => void;
};

const InteractionSearchFooter = ({
  entityHeading,
  onCreateEntity,
  onOpenGlobalSearch
}: InteractionSearchFooterProps) => {
  if (!onCreateEntity && !onOpenGlobalSearch) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-surface-1/80 px-3 py-2 text-xs text-muted-foreground">
      {onCreateEntity ? (
        <button
          type="button"
          onClick={onCreateEntity}
          className="text-primary font-semibold hover:text-primary"
        >
          {`+ Creer ${entityHeading.toLowerCase()}`}
        </button>
      ) : (
        <span />
      )}
      {onOpenGlobalSearch && (
        <button
          type="button"
          onClick={onOpenGlobalSearch}
          className="text-muted-foreground hover:text-foreground"
        >
          <span className="sm:hidden">Voir tout</span>
          <span className="hidden sm:inline">Voir tout (Ctrl+K)</span>
        </button>
      )}
    </div>
  );
};

export default InteractionSearchFooter;
