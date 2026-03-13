import type { UseFormRegisterReturn } from 'react-hook-form';

import { Textarea } from '@/components/ui/textarea';

type ProspectFormNotesSectionProps = {
  notesField: UseFormRegisterReturn;
};

const ProspectFormNotesSection = ({ notesField }: ProspectFormNotesSectionProps) => (
  <div>
    <label htmlFor="prospect-notes" className="text-sm font-medium text-foreground">Notes</label>
    <Textarea
      id="prospect-notes"
      {...notesField}
      rows={3}
      placeholder="Informations complementaires"
    />
  </div>
);

export default ProspectFormNotesSection;
