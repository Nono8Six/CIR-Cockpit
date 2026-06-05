import { Building2 } from 'lucide-react';

interface SettingsHeaderProps {
  readOnly: boolean;
}

const SettingsHeader = ({
  readOnly,
}: SettingsHeaderProps) => {
  return (
    <header className="shrink-0 border-b border-border/70 bg-card px-3 py-2 sm:px-5" aria-label="En-tête des paramètres">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex size-7 shrink-0 items-center justify-center border border-border bg-surface-1 text-primary">
            <Building2 className="size-3.5" aria-hidden="true" />
          </div>
          <div className="flex min-w-0 flex-col sm:flex-row sm:items-center sm:gap-2">
            <span className="hidden shrink-0 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:inline">
              Configuration
            </span>
            <h2 className="truncate text-sm font-semibold tracking-tight text-foreground">
              Paramètres utiles et sûrs
            </h2>
          </div>
        </div>
        <p className="hidden min-w-0 max-w-[74ch] truncate text-xs text-muted-foreground md:block">
          {readOnly
            ? 'Lecture seule : consultez les impacts avant de demander une modification.'
            : 'Modifiez uniquement les réglages à impact métier. Les valeurs utilisées dans l’historique sont signalées avant action.'}
        </p>
      </div>
    </header>
  );
};

export default SettingsHeader;
