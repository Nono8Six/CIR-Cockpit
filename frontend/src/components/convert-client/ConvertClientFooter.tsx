import { ClipboardList } from 'lucide-react';

import { Button } from '@/components/ui/button';

type ConvertClientFooterProps = {
  isSubmitting: boolean;
  onCancel: () => void;
};

const ConvertClientFooter = ({ isSubmitting, onCancel }: ConvertClientFooterProps) => {
  return (
    <div className="flex items-center justify-between gap-2 pt-1">
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <ClipboardList size={13} />
        <span>Le numero client est obligatoire pour activer le compte.</span>
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          Convertir
        </Button>
      </div>
    </div>
  );
};

export default ConvertClientFooter;
