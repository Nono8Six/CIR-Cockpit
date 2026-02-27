import { Building2 } from 'lucide-react';

type ProspectFormHeaderProps = {
  isEdit: boolean;
  relationLabel: string;
};

const ProspectFormHeader = ({ isEdit, relationLabel }: ProspectFormHeaderProps) => (
  <div className="flex items-center gap-3 px-6 py-4 border-b border-border/70 bg-card/80 backdrop-blur">
    <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
      <Building2 size={18} />
    </div>
    <div className="space-y-0.5">
      <p className="text-xs uppercase tracking-wide text-muted-foreground/80">{relationLabel}</p>
      <h3 className="text-base font-semibold text-foreground">
        {isEdit ? 'Modifier le prospect' : 'Nouveau prospect'}
      </h3>
    </div>
  </div>
);

export default ProspectFormHeader;
