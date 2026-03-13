import type { UseFormRegisterReturn } from 'react-hook-form';

import { Textarea } from '@/components/ui/textarea';

type ClientFormNotesSectionProps = {
  notesField: UseFormRegisterReturn;
};

const ClientFormNotesSection = ({ notesField }: ClientFormNotesSectionProps) => (
  <div>
    <label htmlFor="client-notes" className="text-sm font-medium text-foreground">Notes</label>
    <Textarea
      id="client-notes"
      {...notesField}
      rows={3}
      placeholder="Informations complementaires"
    />
  </div>
);

export default ClientFormNotesSection;
