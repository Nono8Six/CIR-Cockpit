import type { UseFormRegisterReturn } from 'react-hook-form';

type ContactFormNotesSectionProps = {
  notesField: UseFormRegisterReturn;
};

const ContactFormNotesSection = ({ notesField }: ContactFormNotesSectionProps) => (
  <div>
    <label className="text-xs font-medium text-slate-500" htmlFor="contact-notes">Notes</label>
    <textarea
      {...notesField}
      id="contact-notes"
      rows={3}
      className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
      placeholder="Informations complementaires"
    />
  </div>
);

export default ContactFormNotesSection;
