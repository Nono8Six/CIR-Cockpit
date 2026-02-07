import { Building2 } from 'lucide-react';

type ProspectFormHeaderProps = {
  isEdit: boolean;
  relationLabel: string;
};

const ProspectFormHeader = ({ isEdit, relationLabel }: ProspectFormHeaderProps) => (
  <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-white/80 backdrop-blur">
    <div className="h-9 w-9 rounded-xl bg-cir-red/10 text-cir-red flex items-center justify-center">
      <Building2 size={18} />
    </div>
    <div className="space-y-0.5">
      <p className="text-xs uppercase tracking-wide text-slate-400">{relationLabel}</p>
      <h3 className="text-base font-semibold text-slate-900">
        {isEdit ? 'Modifier le prospect' : 'Nouveau prospect'}
      </h3>
    </div>
  </div>
);

export default ProspectFormHeader;
