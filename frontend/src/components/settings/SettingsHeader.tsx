import { RotateCcw, Save } from 'lucide-react';

type SettingsHeaderProps = {
  readOnly: boolean;
  isSaving: boolean;
  onReset: () => void;
  onSave: () => Promise<void>;
};

const SettingsHeader = ({ readOnly, isSaving, onReset, onSave }: SettingsHeaderProps) => {
  return (
    <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shrink-0">
      <h2 className="font-semibold text-slate-800 text-lg">Parametrage Agence</h2>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onReset}
          className="flex items-center gap-2 text-xs bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 px-3 py-2 rounded-md transition font-medium"
        >
          <RotateCcw size={14} /> Recharger
        </button>
        <button
          type="button"
          onClick={onSave}
          className={`flex items-center gap-2 text-sm px-4 py-2 rounded-md font-semibold transition shadow-sm ${
            readOnly || isSaving
              ? 'bg-slate-300 text-slate-600 cursor-not-allowed'
              : 'bg-cir-red hover:bg-red-700 text-white'
          }`}
          disabled={readOnly || isSaving}
          aria-disabled={readOnly || isSaving}
        >
          <Save size={16} /> {isSaving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>
    </div>
  );
};

export default SettingsHeader;
