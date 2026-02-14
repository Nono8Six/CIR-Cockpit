import { RotateCcw, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';

type SettingsHeaderProps = {
  readOnly: boolean;
  isSaving: boolean;
  onReset: () => void;
  onSave: () => Promise<void>;
};

const SettingsHeader = ({ readOnly, isSaving, onReset, onSave }: SettingsHeaderProps) => {
  return (
    <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-3 sm:px-6 sm:py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-semibold text-slate-800 sm:text-lg">Parametrage agence</h2>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onReset}
            className="h-9 text-xs sm:text-sm"
          >
            <RotateCcw size={14} className="mr-1" /> Recharger
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={onSave}
            className="h-9 text-xs sm:text-sm"
            disabled={readOnly || isSaving}
            aria-disabled={readOnly || isSaving}
            data-testid="settings-save-button"
          >
            <Save size={15} className="mr-1" /> {isSaving ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>
      </div>
      <div className="sr-only" aria-live="polite">
        {isSaving ? 'Enregistrement en cours.' : 'Aucun enregistrement en cours.'}
      </div>
    </div>
  );
};

export default SettingsHeader;
