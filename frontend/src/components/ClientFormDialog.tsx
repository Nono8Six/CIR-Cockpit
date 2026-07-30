import type { DirectoryCommercialOption } from '../../../shared/schemas/system/directory.schema';

import type { AccountType, Agency, UserRole } from '@/types';
import type { ClientPayload } from '@/services/clients/saveClient';
import { useClientFormDialog } from '../hooks/entities/clients/useClientFormDialog';
import { useClientFormDialogFields } from '../hooks/entities/clients/useClientFormDialogFields';
import EntityOnboardingDialog from './EntityOnboardingDialog';
import ClientFormContent from './client-form/ClientFormContent';
import ClientFormHeader from './client-form/ClientFormHeader';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/feedback/Dialog';

type ClientDialogValue = {
  id: string;
  client_kind?: string | null;
  client_number: string | null;
  account_type: AccountType | null;
  name: string;
  address: string | null;
  postal_code: string | null;
  department: string | null;
  city: string | null;
  siret?: string | null;
  siren?: string | null;
  naf_code?: string | null;
  official_name?: string | null;
  official_data_source?: string | null;
  official_data_synced_at?: string | null;
  notes: string | null;
  agency_id: string | null;
  cir_commercial_id?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  email?: string | null;
  primary_contact_id?: string | null;
};

type ClientFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: ClientDialogValue | null;
  agencies: Agency[];
  userRole: UserRole;
  activeAgencyId: string | null;
  commercials?: DirectoryCommercialOption[];
  defaultClientKind?: 'company' | 'individual';
  onSave: (payload: ClientPayload) => Promise<void>;
};

const ClientFormDialogLegacy = ({
  open,
  onOpenChange,
  client,
  agencies,
  userRole,
  activeAgencyId,
  commercials = [],
  onSave
}: ClientFormDialogProps & { client: ClientDialogValue }) => {
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
    commercials,
    onSave,
    onOpenChange
  });

  const {
    clientNumberField,
    accountTypeField,
    nameField,
    cirCommercialField,
    addressField,
    cityField,
    postalCodeField,
    siretField,
    sirenField,
    nafCodeField,
    officialNameField,
    agencyField,
    notesField,
    firstNameField,
    lastNameField,
    emailField,
    phoneField,
    cirCommercialValue,
    errors,
    isSubmitting,
    handleSubmit
  } = useClientFormDialogFields(form);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        overlayClassName="bg-neutral-950/20 backdrop-blur-sm"
        className="w-[min(95vw,680px)] max-w-2xl overflow-hidden rounded-xl border border-neutral-200/60 p-0 shadow-2xl shadow-neutral-900/8 bg-white animate-in fade-in-0 zoom-in-[0.98] duration-200"
      >
        <DialogTitle className="sr-only">Modifier un client</DialogTitle>
        <DialogDescription className="sr-only">Formulaire de saisie client.</DialogDescription>
        <ClientFormHeader isEdit />
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col max-h-[min(85vh,720px)]">
          <ClientFormContent
            isSubmitting={isSubmitting}
            agencies={agencies}
            userRole={userRole}
            form={form}
            clientNumberField={clientNumberField}
            clientNumber={clientNumber}
            onClientNumberChange={handleClientNumberChange}
            accountTypeField={accountTypeField}
            accountType={accountType}
            errors={errors}
            nameField={nameField}
            commercials={commercials}
            cirCommercialField={cirCommercialField}
            cirCommercialValue={cirCommercialValue}
            addressField={addressField}
            cityField={cityField}
            postalCodeField={postalCodeField}
            postalCode={postalCode}
            onPostalCodeChange={handlePostalCodeChange}
            siretField={siretField}
            sirenField={sirenField}
            nafCodeField={nafCodeField}
            officialNameField={officialNameField}
            agencyField={agencyField}
            agencyValue={agencyValue}
            agencyLabel={agencyLabel}
            notesField={notesField}
            firstNameField={firstNameField}
            lastNameField={lastNameField}
            emailField={emailField}
            phoneField={phoneField}
            onCancel={() => onOpenChange(false)}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
};

const ClientFormDialog = (props: ClientFormDialogProps & { defaultName?: string }) => {
  if (!props.client || props.client.client_kind === 'individual') {
    return (
      <EntityOnboardingDialog
        open={props.open}
        onOpenChange={props.onOpenChange}
        agencies={props.agencies}
        userRole={props.userRole}
        activeAgencyId={props.activeAgencyId}
        commercials={props.commercials}
        allowedIntents={['client']}
        defaultIntent="client"
        defaultClientKind={props.defaultClientKind}
        initialEntity={props.client ?? (props.defaultName ? { name: props.defaultName } : null)}
        sourceLabel={props.client ? 'Édition client' : 'Création'}
        onSaveClient={props.onSave}
      />
    );
  }

  return <ClientFormDialogLegacy {...props} client={props.client} />;
};

export default ClientFormDialog;
