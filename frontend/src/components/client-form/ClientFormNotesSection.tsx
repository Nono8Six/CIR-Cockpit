import type { UseFormRegisterReturn } from 'react-hook-form';

type ClientFormNotesSectionProps = {
  notesField: UseFormRegisterReturn;
};

const ClientFormNotesSection = ({ notesField }: ClientFormNotesSectionProps) => (
  <div>
    <label htmlFor="client-notes" className="text-xs font-medium text-muted-foreground">Notes</label>
    <textarea
      id="client-notes"
      {...notesField}
      rows={4}
      className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
      placeholder="Informations complementaires"
    />
  </div>
);

export default ClientFormNotesSection;
