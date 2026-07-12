import { useState } from 'react';

import { Button } from '@/components/ui/inputs/basic/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle
} from '@/components/ui/feedback/Dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/inputs/selects/Select';
import type { Interaction } from '@/types';
import { getInteractionDisplayName } from '@/utils/interactions/getInteractionDisplayName';
import { PIPELINE_LOST_REASONS } from './pipelineColumnsConfig';

type PipelineLostDialogProps = {
  interaction: Interaction | null;
  isSubmitting: boolean;
  onConfirm: (interaction: Interaction, lostReason: string) => void;
  onCancel: () => void;
};

const PipelineLostDialog = ({
  interaction,
  isSubmitting,
  onConfirm,
  onCancel
}: PipelineLostDialogProps) => {
  const [lostReason, setLostReason] = useState<string>(PIPELINE_LOST_REASONS[0]);

  return (
    <Dialog
      open={interaction !== null}
      onOpenChange={(open) => {
        if (!open && !isSubmitting) {
          onCancel();
        }
      }}
    >
      <DialogContent
        className="max-w-md"
        data-testid="dashboard-pipeline-lost-dialog"
      >
        <DialogTitle>Marquer le dossier comme perdu</DialogTitle>
        <DialogDescription>
          {interaction
            ? `« ${getInteractionDisplayName(interaction)} » sera clôturé. Le motif alimente le taux de transformation.`
            : ''}
        </DialogDescription>
        <div>
          <label
            htmlFor="pipeline-lost-reason"
            className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            Motif de perte
          </label>
          <Select value={lostReason} onValueChange={setLostReason}>
            <SelectTrigger id="pipeline-lost-reason" data-testid="dashboard-pipeline-lost-reason">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PIPELINE_LOST_REASONS.map((reason) => (
                <SelectItem key={reason} value={reason}>
                  {reason}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={isSubmitting} onClick={onCancel}>
            Annuler
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={isSubmitting || !interaction}
            onClick={() => {
              if (interaction) {
                onConfirm(interaction, lostReason);
              }
            }}
          >
            {isSubmitting ? 'Clôture…' : 'Marquer perdu'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PipelineLostDialog;
