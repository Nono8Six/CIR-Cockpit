import { ClipboardList } from 'lucide-react';

import { Button } from '@/components/ui/button';

type ContactFormFooterProps = {
  isEdit: boolean;
  isSubmitting: boolean;
  onCancel: () => void;
};

const ContactFormFooter = ({
  isEdit,
  isSubmitting,
  onCancel
}: ContactFormFooterProps) => (
  <div className="flex items-center justify-between gap-2 pt-1">
    <div className="flex items-center gap-2 text-[11px] text-slate-400">
      <ClipboardList size={13} />
      <span>Renseignez le contact pour l&apos;interaction.</span>
    </div>
    <Button type="button" variant="outline" onClick={onCancel}>
      Annuler
    </Button>
    <Button type="submit" disabled={isSubmitting}>
      {isEdit ? 'Enregistrer' : 'Ajouter'}
    </Button>
  </div>
);

export default ContactFormFooter;
