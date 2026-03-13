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
  <div className="flex items-center justify-end gap-2 pt-1">
    <Button type="button" variant="outline" onClick={onCancel}>
      Annuler
    </Button>
    <Button type="submit" disabled={isSubmitting}>
      {isEdit ? 'Enregistrer' : 'Creer'}
    </Button>
  </div>
);

export default ClientFormFooter;
