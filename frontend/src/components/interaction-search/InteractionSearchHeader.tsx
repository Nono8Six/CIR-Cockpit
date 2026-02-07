import { Switch } from '@/components/ui/switch';

type InteractionSearchHeaderProps = {
  includeArchived: boolean;
  onIncludeArchivedChange: (value: boolean) => void;
};

const InteractionSearchHeader = ({
  includeArchived,
  onIncludeArchivedChange
}: InteractionSearchHeaderProps) => (
  <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3">
    <div className="flex items-center gap-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Recherche</p>
      <span className="text-[10px] font-semibold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
        F1
      </span>
    </div>
    <div className="flex items-center gap-2">
      <label htmlFor="search-archived-toggle" className="text-[10px] font-medium text-slate-500">
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
