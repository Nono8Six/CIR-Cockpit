import type { EntityContact } from '@/types';
import type { EntityContactPayload } from '@/services/entities/saveEntityContact';
import { useClientContactDialog } from '@/hooks/useClientContactDialog';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog';
import ContactFormHeader from './contact-form/ContactFormHeader';
import ContactFormIdentitySection from './contact-form/ContactFormIdentitySection';
import ContactFormContactSection from './contact-form/ContactFormContactSection';
import ContactFormPositionSection from './contact-form/ContactFormPositionSection';
import ContactFormNotesSection from './contact-form/ContactFormNotesSection';
import ContactFormFooter from './contact-form/ContactFormFooter';

interface ClientContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: EntityContact | null;
  entityId: string;
  onSave: (payload: EntityContactPayload) => Promise<void>;
}

const ClientContactDialog = ({
  open,
  onOpenChange,
  contact,
  entityId,
  onSave
}: ClientContactDialogProps) => {
  const isEdit = Boolean(contact);
  const {
    form,
    phoneValue,
    handlePhoneChange,
    onSubmit
  } = useClientContactDialog({
    open,
    contact,
    entityId,
    onSave,
    onOpenChange
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = form;

  const firstNameField = register('first_name');
  const lastNameField = register('last_name');
  const emailField = register('email');
  const phoneField = register('phone');
  const positionField = register('position');
  const notesField = register('notes');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="bg-foreground/20 backdrop-blur-[2px]"
        className="w-[min(92vw,620px)] max-w-2xl p-0 overflow-hidden rounded-2xl border border-border/70 shadow-2xl"
      >
        <DialogTitle className="sr-only">
          {isEdit ? 'Modifier un contact' : 'Nouveau contact'}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Formulaire de saisie contact.
        </DialogDescription>
        <ContactFormHeader isEdit={isEdit} />
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 px-6 py-5">
          <ContactFormIdentitySection
            firstNameField={firstNameField}
            lastNameField={lastNameField}
            errors={errors}
          />
          <ContactFormContactSection
            emailField={emailField}
            phoneField={phoneField}
            phoneValue={phoneValue}
            onPhoneChange={handlePhoneChange}
            errors={errors}
          />
          <ContactFormPositionSection positionField={positionField} />
          <ContactFormNotesSection notesField={notesField} />
          {errors.root?.message ? <p className="text-sm text-destructive">{errors.root.message}</p> : null}
          <ContactFormFooter
            isEdit={isEdit}
            isSubmitting={isSubmitting}
            onCancel={() => onOpenChange(false)}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ClientContactDialog;
