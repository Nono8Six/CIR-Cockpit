import type { UseFormRegisterReturn } from 'react-hook-form';

type ProspectFormNotesSectionProps = {
  notesField: UseFormRegisterReturn;
};

const ProspectFormNotesSection = ({ notesField }: ProspectFormNotesSectionProps) => (
  <div>
    <label htmlFor="prospect-notes" className="text-xs font-medium text-muted-foreground">Notes</label>
    <textarea
      id="prospect-notes"
      {...notesField}
      rows={4}
      className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
      placeholder="Informations complementaires"
    />
  </div>
);

export default ProspectFormNotesSection;
