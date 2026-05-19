import { Button } from '../ui/inputs/basic/Button';

type UserCreateFooterProps = {
  canSubmit: boolean;
  isSubmitting: boolean;
  onCancel: () => void;
};

const UserCreateFooter = ({ canSubmit, isSubmitting, onCancel }: UserCreateFooterProps) => {
  return (
    <div className="flex justify-end gap-2">
      <Button type="button" variant="outline" onClick={onCancel}>
        Annuler
      </Button>
      <Button type="submit" disabled={!canSubmit || isSubmitting}>
        Creer
      </Button>
    </div>
  );
};

export default UserCreateFooter;
