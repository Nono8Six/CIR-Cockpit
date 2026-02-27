import { Paperclip, SendHorizontal } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

type InteractionFooterNoteComposerProps = {
  note: string;
  onNoteChange: (value: string) => void;
  onSubmit: () => void;
  isSubmitDisabled: boolean;
};

const InteractionFooterNoteComposer = ({
  note,
  onNoteChange,
  onSubmit,
  isSubmitDisabled
}: InteractionFooterNoteComposerProps) => (
  <div className="relative">
    <Textarea
      value={note}
      onChange={(event) => onNoteChange(event.target.value)}
      placeholder="Ajouter une note de suivi, compte-rendu d'appel..."
      className="min-h-[96px] resize-none bg-card pr-20 text-sm"
      onKeyDown={(event) => {
        if (event.ctrlKey && event.key === 'Enter') {
          onSubmit();
        }
      }}
      aria-label="Ajouter une note de suivi"
      autoComplete="off"
      name="interaction-note"
    />
    <div className="absolute bottom-2.5 right-2.5 flex gap-1.5">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-8 text-muted-foreground hover:text-foreground"
        title="Joindre un fichier (Simulation)"
        aria-label="Joindre un fichier"
      >
        <Paperclip size={16} />
      </Button>
      <Button
        type="button"
        size="icon"
        className="size-8 bg-primary text-white hover:bg-primary/90"
        onClick={onSubmit}
        disabled={isSubmitDisabled}
        aria-label="Envoyer la mise a jour"
      >
        <SendHorizontal size={14} />
      </Button>
    </div>
  </div>
);

export default InteractionFooterNoteComposer;
