import type { Agency, Client, UserRole } from '@/types';
import type { ClientPayload } from '@/services/clients/saveClient';
import { useClientFormDialog } from '@/hooks/useClientFormDialog';
import { useClientFormDialogFields } from '@/hooks/useClientFormDialogFields';
import { Dialog, DialogContent } from './ui/dialog';
import ClientFormContent from './client-form/ClientFormContent';
import ClientFormHeader from './client-form/ClientFormHeader';

interface ClientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
  agencies: Agency[];
  userRole: UserRole;
  activeAgencyId: string | null;
  onSave: (payload: ClientPayload) => Promise<void>;
}

const ClientFormDialog = ({
  open,
  onOpenChange,
  client,
  agencies,
  userRole,
  activeAgencyId,
  onSave
}: ClientFormDialogProps) => {
  const isEdit = Boolean(client);
  const {
    form,
    clientNumber,
    postalCode,
    accountType,
    agencyValue,
    agencyLabel,
    handleClientNumberChange,
    handlePostalCodeChange,
    onSubmit
  } = useClientFormDialog({
    open,
    client,
    agencies,
    userRole,
    activeAgencyId,
    onSave,
    onOpenChange
  });

  const {
    clientNumberField,
    accountTypeField,
    nameField,
    addressField,
    cityField,
    postalCodeField,
    siretField,
    agencyField,
    notesField,
    errors,
    isSubmitting,
    handleSubmit,
  } = useClientFormDialogFields(form);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="bg-slate-900/20 backdrop-blur-[2px]"
        className="w-[min(92vw,780px)] max-w-3xl p-0 overflow-hidden rounded-2xl border border-slate-200/70 shadow-2xl"
      >
        <ClientFormHeader isEdit={isEdit} />
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 px-6 py-5">
          <ClientFormContent
            isEdit={isEdit}
            isSubmitting={isSubmitting}
            agencies={agencies}
            userRole={userRole}
            clientNumberField={clientNumberField}
            clientNumber={clientNumber}
            onClientNumberChange={handleClientNumberChange}
            accountTypeField={accountTypeField}
            accountType={accountType}
            errors={errors}
            nameField={nameField}
            addressField={addressField}
            cityField={cityField}
            postalCodeField={postalCodeField}
            postalCode={postalCode}
            onPostalCodeChange={handlePostalCodeChange}
            siretField={siretField}
            agencyField={agencyField}
            agencyValue={agencyValue}
            agencyLabel={agencyLabel}
            notesField={notesField}
            onCancel={() => onOpenChange(false)}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ClientFormDialog;
