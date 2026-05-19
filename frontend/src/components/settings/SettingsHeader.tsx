import { Settings } from 'lucide-react';

/**
 * Premium header for the Settings module, illustrating Warm Editorial styling.
 *
 * @returns {JSX.Element} The rendered header.
 */
const SettingsHeader = () => {
  return (
    <header className="shrink-0 border-b border-border bg-card px-6 py-5" aria-label="En-tête des paramètres">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm">
          <Settings className="size-5" />
        </div>
        <div className="space-y-0.5">
          <h2 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
            Configuration de l&apos;Agence
          </h2>
          <p className="text-xs text-muted-foreground">
            Gérez les habilitations, les listes de valeurs globales et le workflow Kanban.
          </p>
        </div>
      </div>
    </header>
  );
};

export default SettingsHeader;
