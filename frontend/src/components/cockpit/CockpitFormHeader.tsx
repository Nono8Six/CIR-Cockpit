import { ArrowUpRight, Save } from 'lucide-react';

import { Button } from '@/components/ui/button';

type CockpitFormHeaderProps = {
  canSave: boolean;
  gateMessage: string | null;
  formId: string;
  onFocusRequired: () => void;
};

const CockpitFormHeader = ({
  canSave,
  gateMessage,
  formId,
  onFocusRequired
}: CockpitFormHeaderProps) => {
  return (
    <div className="bg-white border-b border-slate-200 px-5 py-2 shrink-0 flex justify-between items-center">
      <h2 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
        <ArrowUpRight className="text-cir-red" size={16} />
        Nouvelle Interaction
      </h2>
      <div className="flex items-center gap-3">
        <span className="text-xs uppercase font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded border border-slate-200">
          Ctrl{"\u00A0"}+{"\u00A0"}Enter
        </span>
        <Button
          type="submit"
          form={formId}
          disabled={!canSave}
          className="h-8 px-3 text-xs gap-1.5"
          title={canSave ? 'Pret a enregistrer' : gateMessage ?? undefined}
        >
          <Save size={12} />
          Enregistrer
        </Button>
        {!canSave && gateMessage ? (
          <button
            type="button"
            onClick={onFocusRequired}
            className="h-8 px-2.5 rounded-md border border-amber-200 bg-amber-50 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition-colors"
            aria-label="Aller au champ requis"
          >
            {gateMessage}
          </button>
        ) : null}
        {canSave ? (
          <span className="text-xs font-semibold text-emerald-700">Pret a enregistrer</span>
        ) : null}
      </div>
    </div>
  );
};

export default CockpitFormHeader;
