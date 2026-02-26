import type { Agency, Entity, UserRole } from '@/types';
import type { EntityPayload } from '@/services/entities/saveEntity';
import { useProspectFormDialog } from '@/hooks/useProspectFormDialog';
import { useProspectFormDialogFields } from '@/hooks/useProspectFormDialogFields';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog';
import ProspectFormContent from './prospect-form/ProspectFormContent';
import ProspectFormHeader from './prospect-form/ProspectFormHeader';

interface ProspectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prospect: Entity | null;
  agencies: Agency[];
  userRole: UserRole;
  activeAgencyId: string | null;
  onSave: (payload: EntityPayload) => Promise<void>;
}

const ProspectFormDialog = ({
  open,
  onOpenChange,
  prospect,
  agencies,
  userRole,
  activeAgencyId,
  onSave
}: ProspectFormDialogProps) => {
  const isEdit = Boolean(prospect);
  const {
    form,
    postalCode,
    agencyValue,
    agencyLabel,
    relationLabel,
    handlePostalCodeChange,
    onSubmit
  } = useProspectFormDialog({
    open,
    prospect,
    agencies,
    userRole,
    activeAgencyId,
    onSave,
    onOpenChange
  });

  const {
    nameField,
    cityField,
    addressField,
    postalCodeField,
    siretField,
    agencyField,
    notesField,
    errors,
    isSubmitting,
    handleSubmit,
  } = useProspectFormDialogFields(form);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="bg-slate-900/20 backdrop-blur-[2px]"
        className="w-[min(92vw,780px)] max-w-3xl p-0 overflow-hidden rounded-2xl border border-slate-200/70 shadow-2xl"
      >
        <DialogTitle className="sr-only">
          {isEdit ? 'Modifier un prospect' : 'Nouveau prospect'}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Formulaire de saisie prospect.
        </DialogDescription>
        <ProspectFormHeader isEdit={isEdit} relationLabel={relationLabel} />
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 px-6 py-5">
          <ProspectFormContent
            isEdit={isEdit}
            isSubmitting={isSubmitting}
            errors={errors}
            nameField={nameField}
            cityField={cityField}
            addressField={addressField}
            postalCodeField={postalCodeField}
            postalCode={postalCode}
            onPostalCodeChange={handlePostalCodeChange}
            siretField={siretField}
            agencyField={agencyField}
            agencyValue={agencyValue}
            agencies={agencies}
            userRole={userRole}
            agencyLabel={agencyLabel}
            notesField={notesField}
            onCancel={() => onOpenChange(false)}
          />
          {errors.root?.message ? <p className="text-sm text-red-600">{errors.root.message}</p> : null}
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProspectFormDialog;
