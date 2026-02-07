import type { UseFormRegisterReturn } from 'react-hook-form';

type ClientFormNotesSectionProps = {
  notesField: UseFormRegisterReturn;
};

const ClientFormNotesSection = ({ notesField }: ClientFormNotesSectionProps) => (
  <div>
    <label className="text-xs font-medium text-slate-500">Notes</label>
    <textarea
      {...notesField}
      rows={4}
      className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
      placeholder="Informations complementaires"
    />
  </div>
);

export default ClientFormNotesSection;
