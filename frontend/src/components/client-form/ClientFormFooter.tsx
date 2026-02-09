import { ClipboardList } from 'lucide-react';

import { Button } from '@/components/ui/button';

type ClientFormFooterProps = {
  isEdit: boolean;
  isSubmitting: boolean;
  onCancel: () => void;
};

const ClientFormFooter = ({
  isEdit,
  isSubmitting,
  onCancel
}: ClientFormFooterProps) => (
  <div className="flex items-center justify-between gap-2 pt-1">
    <div className="flex items-center gap-2 text-xs text-slate-400">
      <ClipboardList size={13} />
      <span>Champs obligatoires pour creer la fiche client.</span>
    </div>
    <Button type="button" variant="outline" onClick={onCancel}>
      Annuler
    </Button>
    <Button type="submit" disabled={isSubmitting}>
      {isEdit ? 'Enregistrer' : 'Creer'}
    </Button>
  </div>
);

export default ClientFormFooter;
