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
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50/80 px-3 py-2 text-xs text-slate-500">
      {onCreateEntity ? (
        <button
          type="button"
          onClick={onCreateEntity}
          className="text-cir-red font-semibold hover:text-red-700"
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
          className="text-slate-500 hover:text-slate-700"
        >
          <span className="sm:hidden">Voir tout</span>
          <span className="hidden sm:inline">Voir tout (Ctrl+K)</span>
        </button>
      )}
    </div>
  );
};

export default InteractionSearchFooter;
