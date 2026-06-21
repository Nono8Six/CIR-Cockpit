import { Loader2 } from 'lucide-react';

import { Button } from '../ui/inputs/basic/Button';

type ClientFormFooterProps = {
  isSubmitting: boolean;
  onCancel: () => void;
  rootError: string | undefined;
};

/**
 * Compact footer with error message and action buttons.
 * Styled as a borderless bottom bar.
 */
const ClientFormFooter = ({ isSubmitting, onCancel, rootError }: ClientFormFooterProps) => (
  <div className="px-6 py-3.5 border-t border-neutral-100/80 bg-white">
    {rootError && (
      <p className="text-destructive text-[11px] font-medium mb-2.5 bg-destructive/5 rounded-md px-3 py-2">{rootError}</p>
    )}
    <div className="flex items-center justify-end gap-2">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onCancel}
        disabled={isSubmitting}
        className="text-[12px] font-medium text-neutral-500 hover:text-neutral-700"
      >
        Annuler
      </Button>
      <Button
        type="submit"
        size="sm"
        disabled={isSubmitting}
        className="text-[12px] font-medium min-w-[100px]"
      >
        {isSubmitting ? (
          <span className="flex items-center gap-1.5">
            <Loader2 className="h-3 w-3 animate-spin" />
            Enregistrement…
          </span>
        ) : (
          'Enregistrer'
        )}
      </Button>
    </div>
  </div>
);

export default ClientFormFooter;
