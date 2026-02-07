import { Paperclip, Send } from 'lucide-react';

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
    <textarea
      value={note}
      onChange={(event) => onNoteChange(event.target.value)}
      placeholder="Ajouter une note de suivi, compte-rendu d'appel..."
      className="w-full bg-white border border-slate-300 rounded-lg p-3 pr-12 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 focus:outline-none resize-none h-24 shadow-sm"
      onKeyDown={(event) => {
        if (event.ctrlKey && event.key === 'Enter') onSubmit();
      }}
      aria-label="Ajouter une note de suivi"
      autoComplete="off"
      name="interaction-note"
    />
    <div className="absolute bottom-3 right-3 flex gap-2">
      <button
        type="button"
        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cir-red/30"
        title="Joindre un fichier (Simulation)"
        aria-label="Joindre un fichier"
      >
        <Paperclip size={18} />
      </button>
      <button
        type="button"
        onClick={onSubmit}
        disabled={isSubmitDisabled}
        className="bg-cir-red text-white p-2 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cir-red/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
        aria-label="Envoyer la mise a jour"
      >
        <Send size={16} />
      </button>
    </div>
  </div>
);

export default InteractionFooterNoteComposer;
