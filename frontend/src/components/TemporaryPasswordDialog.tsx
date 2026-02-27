import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';

interface TemporaryPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  password: string;
  title: string;
  description?: string;
}

const TemporaryPasswordDialog = ({
  open,
  onOpenChange,
  password,
  title,
  description
}: TemporaryPasswordDialogProps) => {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(password);
    } catch {
      // no-op
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description ?? 'Mot de passe temporaire genere.'}</DialogDescription>
        </DialogHeader>
        <div className="bg-muted border border-border rounded-md p-3 font-mono text-sm text-foreground">
          {password}
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={handleCopy}>
            Copier
          </Button>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TemporaryPasswordDialog;
