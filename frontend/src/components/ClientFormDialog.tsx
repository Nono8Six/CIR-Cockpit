import type { DirectoryCommercialOption } from 'shared/schemas/directory.schema';

import type { AccountType, Agency, UserRole } from '@/types';
import type { ClientPayload } from '@/services/clients/saveClient';
import type { EntityPayload } from '@/services/entities/saveEntity';
import { useClientFormDialog } from '@/hooks/useClientFormDialog';
import { useClientFormDialogFields } from '@/hooks/useClientFormDialogFields';
import EntityOnboardingDialog from './EntityOnboardingDialog';
import ClientFormContent from './client-form/ClientFormContent';
import ClientFormHeader from './client-form/ClientFormHeader';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog';

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
};

type ClientFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: ClientDialogValue | null;
  agencies: Agency[];
  userRole: UserRole;
  activeAgencyId: string | null;
  commercials?: DirectoryCommercialOption[];
  onSave: (payload: ClientPayload) => Promise<void>;
};

const createProspectFallback = async (): Promise<void> => undefined;

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
    agencyField,
    notesField,
    cirCommercialValue,
    errors,
    isSubmitting,
    handleSubmit
  } = useClientFormDialogFields(form);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="bg-foreground/20 backdrop-blur-[2px]"
        className="w-[min(92vw,780px)] max-w-3xl overflow-hidden rounded-2xl border border-border/70 p-0 shadow-2xl"
      >
        <DialogTitle className="sr-only">Modifier un client</DialogTitle>
        <DialogDescription className="sr-only">Formulaire de saisie client.</DialogDescription>
        <ClientFormHeader isEdit />
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 px-6 py-5">
          <ClientFormContent
            isEdit
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
            commercials={commercials}
            cirCommercialField={cirCommercialField}
            cirCommercialValue={cirCommercialValue}
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
          {errors.root?.message ? <p className="text-sm text-destructive">{errors.root.message}</p> : null}
        </form>
      </DialogContent>
    </Dialog>
  );
};

const ClientFormDialog = (props: ClientFormDialogProps) => {
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
        initialEntity={props.client}
        sourceLabel={props.client ? 'Edition client' : 'Creation'}
        onSaveClient={props.onSave}
        onSaveProspect={createProspectFallback as (payload: EntityPayload) => Promise<void>}
      />
    );
  }

  return <ClientFormDialogLegacy {...props} client={props.client} />;
};

export default ClientFormDialog;
