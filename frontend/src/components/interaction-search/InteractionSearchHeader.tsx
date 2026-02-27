import { Switch } from '@/components/ui/switch';

type InteractionSearchHeaderProps = {
  includeArchived: boolean;
  onIncludeArchivedChange: (value: boolean) => void;
};

const InteractionSearchHeader = ({
  includeArchived,
  onIncludeArchivedChange
}: InteractionSearchHeaderProps) => (
  <div className="px-3 py-2 border-b border-border/70 bg-surface-1/80 flex items-center justify-between gap-3">
    <div className="flex items-center gap-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recherche</p>
      <span className="text-xs font-semibold text-muted-foreground bg-card border border-border px-2 py-0.5 rounded-md">
        F1
      </span>
    </div>
    <div className="flex items-center gap-2">
      <label htmlFor="search-archived-toggle" className="text-xs font-medium text-muted-foreground">
        Archivés
      </label>
      <Switch
        id="search-archived-toggle"
        checked={includeArchived}
        onCheckedChange={onIncludeArchivedChange}
        aria-label="Afficher les entites archivees"
      />
    </div>
  </div>
);

export default InteractionSearchHeader;
