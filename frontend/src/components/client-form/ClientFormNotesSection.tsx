import { Textarea } from '../ui/inputs/basic/Textarea';
import type { UseFormRegisterReturn } from 'react-hook-form';

type ClientFormNotesSectionProps = {
  notesField: UseFormRegisterReturn;
};

/**
 * Internal notes section for the client form.
 * Contains a textarea styled with the premium inputs theme.
 */
const ClientFormNotesSection = ({ notesField }: ClientFormNotesSectionProps) => (
  <div className="space-y-4">
    <div className="text-[11px] font-mono font-bold uppercase tracking-widest text-neutral-400 border-b border-neutral-100 pb-1.5">
      07. Notes Internes
    </div>
    <div>
      <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400 mb-1.5 block" htmlFor="client-notes">
        Notes
      </label>
      <Textarea
        id="client-notes"
        {...notesField}
        rows={3}
        placeholder="Ajouter des notes ou consignes sur ce client..."
        className="!border-neutral-200 !bg-neutral-50/50 hover:!bg-neutral-50 hover:!border-neutral-300 focus:!bg-white focus:!border-neutral-400 focus:!ring-0 !rounded-md transition-all !shadow-none text-xs text-neutral-800 placeholder:text-neutral-300 min-h-[64px] resize-y w-full"
      />
    </div>
  </div>
);

export default ClientFormNotesSection;
