import { Building2 } from 'lucide-react';

interface SettingsHeaderProps {
  readOnly: boolean;
}

const SettingsHeader = ({
  readOnly,
}: SettingsHeaderProps) => {
  return (
    <header className="shrink-0 border-b border-border/70 bg-card px-4 py-4 sm:px-5" aria-label="En-tête des paramètres">
      <div className="flex min-w-0 gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center border border-border bg-surface-1 text-primary shadow-soft">
          <Building2 className="size-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Configuration
          </p>
          <h2 className="text-xl font-semibold tracking-tight text-foreground text-pretty">
            Paramètres utiles et sûrs
          </h2>
          <p className="max-w-[78ch] text-xs leading-relaxed text-muted-foreground">
            {readOnly
              ? 'Lecture seule : consultez les impacts avant de demander une modification.'
              : 'Modifiez uniquement les réglages qui ont un impact métier clair. Les valeurs utilisées dans l’historique sont signalées avant action.'}
          </p>
        </div>
      </div>
    </header>
  );
};

export default SettingsHeader;
