import { ArrowUpRight } from 'lucide-react';

type CockpitFormHeaderProps = {
  canSave: boolean;
};

const CockpitFormHeader = ({
  canSave
}: CockpitFormHeaderProps) => {
  return (
    <div data-testid="cockpit-form-header" className="shrink-0 border-b border-border bg-card px-3 py-3 sm:px-5 sm:py-2.5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <ArrowUpRight className="text-primary" size={16} />
          Nouvelle Interaction
        </h2>
        <div data-testid="cockpit-header-actions" className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end sm:gap-3">
          <span className="rounded border border-border bg-muted px-2 py-1 text-xs font-bold uppercase text-muted-foreground">
            Ctrl{"\u00A0"}+{"\u00A0"}Enter
          </span>
          {canSave ? <span className="text-xs font-semibold text-success">Pret a enregistrer</span> : null}
        </div>
      </div>
    </div>
  );
};

export default CockpitFormHeader;
