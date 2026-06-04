import * as React from 'react';
import { AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../ui/feedback/Dialog';
import { Button } from '../../ui/inputs/basic/Button';
import { Input } from '../../ui/inputs/basic/Input';

interface RenameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  defaultValue: string;
  usageCount?: number | null;
  onConfirm: (newValue: string) => void;
}

/**
 * Premium Dialog component for renaming settings items and statuses.
 * Displays a clean text input and displays warning context if the item is currently in use.
 *
 * @param {RenameDialogProps} props - The component properties.
 */
const RenameDialog = ({
  open,
  onOpenChange,
  title,
  defaultValue,
  usageCount = null,
  onConfirm,
}: RenameDialogProps) => {
  const [value, setValue] = React.useState(defaultValue);

  React.useEffect(() => {
    if (open) {
      setValue(defaultValue);
    }
  }, [open, defaultValue]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim() && value.trim() !== defaultValue.trim()) {
      onConfirm(value.trim());
    }
    onOpenChange(false);
  };

  const isUnchanged = value.trim() === defaultValue.trim() || !value.trim();
  const hasUsage = typeof usageCount === 'number' && usageCount > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]" data-testid="rename-dialog">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              Corrigez le libellé. Cette action réécrit définitivement l&apos;historique existant.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <Input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full text-xs"
              required
              aria-label="Nouveau nom"
              autoComplete="off"
            />

            {hasUsage && (
              <div className="flex items-start gap-2 border border-warning/20 bg-warning/5 p-2.5 text-xs text-warning-foreground rounded-sm">
                <AlertCircle className="size-4 shrink-0 text-warning mt-0.5" aria-hidden="true" />
                <div className="leading-normal">
                  <span className="font-semibold">Attention : </span>
                  {usageCount} interaction(s) utilisent actuellement cette valeur. La correction mettra à jour tout l&apos;historique de manière définitive. Pour préserver le sens historique, annulez puis utilisez l&apos;action de retrait.
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isUnchanged}
              className="text-xs"
            >
              Corriger le libellé
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RenameDialog;
