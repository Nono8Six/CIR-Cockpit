import { useState } from 'react';
import { ScrollText } from 'lucide-react';

import type { ConfiguratorEvidence } from 'shared/schemas/configurator/common.schema';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/feedback/Dialog';
import { cn } from '@/lib/utils';
import { EvidenceList } from './EvidenceList';

type EvidenceDialogProps = {
  title: string;
  evidence: readonly ConfiguratorEvidence[];
  /** Libelle du declencheur ; par defaut le nombre de preuves. */
  triggerLabel?: string;
  className?: string;
};

/**
 * Consultation des preuves dans un dialog centre.
 *
 * Aucun panneau lateral : la regle produit CIR impose un dialog centre pour tout
 * detail secondaire. Escape ferme, le focus revient au declencheur.
 */
export const EvidenceDialog = ({
  title,
  evidence,
  triggerLabel,
  className
}: EvidenceDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);

  if (evidence.length === 0) {
    return null;
  }

  const label = triggerLabel
    ?? (evidence.length === 1 ? '1 preuve' : `${evidence.length} preuves`);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex items-center gap-1 rounded-sm text-[11px] font-medium text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            className
          )}
        >
          <ScrollText aria-hidden="true" className="size-3 shrink-0" />
          {label}
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] max-w-2xl grid-rows-[auto_minmax(0,1fr)] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-[15px]">{title}</DialogTitle>
          <DialogDescription className="text-[12px]">
            Provenance des valeurs utilisées. Les documents constructeurs ne sont pas
            consultables depuis le Cockpit : seules leurs métadonnées, leur page et leur
            empreinte sont conservées.
          </DialogDescription>
        </DialogHeader>
        <div className="-mx-1 overflow-y-auto px-1">
          <EvidenceList evidence={evidence} />
        </div>
      </DialogContent>
    </Dialog>
  );
};
