import type { Agency, UserRole } from '@/types';
import type { EntityPayload } from '@/services/entities/saveEntity';
import { useProspectFormDialog } from '@/hooks/useProspectFormDialog';
import { useProspectFormDialogFields } from '@/hooks/useProspectFormDialogFields';
import EntityOnboardingDialog from './EntityOnboardingDialog';
import ProspectFormContent from './prospect-form/ProspectFormContent';
import ProspectFormHeader from './prospect-form/ProspectFormHeader';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from './ui/dialog';

type ProspectDialogValue = {
  id: string;
  entity_type: string;
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
};

type ProspectFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prospect: ProspectDialogValue | null;
  agencies: Agency[];
  userRole: UserRole;
  activeAgencyId: string | null;
  onSave: (payload: EntityPayload) => Promise<void>;
};

const ProspectFormDialogLegacy = ({
  open,
  onOpenChange,
  prospect,
  agencies,
  userRole,
  activeAgencyId,
  onSave
}: ProspectFormDialogProps & { prospect: ProspectDialogValue }) => {
  const {
    form,
    postalCode,
    agencyValue,
    agencyLabel,
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
    handleSubmit
  } = useProspectFormDialogFields(form);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="bg-foreground/20 backdrop-blur-[2px]"
        className="w-[min(92vw,780px)] max-w-3xl overflow-hidden rounded-2xl border border-border/70 p-0 shadow-2xl"
      >
        <DialogTitle className="sr-only">Modifier un prospect</DialogTitle>
        <DialogDescription className="sr-only">Formulaire de saisie prospect.</DialogDescription>
        <ProspectFormHeader isEdit />
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 px-6 py-5">
          <ProspectFormContent
            isEdit
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
          {errors.root?.message ? <p className="text-sm text-destructive">{errors.root.message}</p> : null}
        </form>
      </DialogContent>
    </Dialog>
  );
};

const ProspectFormDialog = (props: ProspectFormDialogProps) => {
  if (!props.prospect) {
    return (
      <EntityOnboardingDialog
        open={props.open}
        onOpenChange={props.onOpenChange}
        agencies={props.agencies}
        userRole={props.userRole}
        activeAgencyId={props.activeAgencyId}
        allowedIntents={['prospect']}
        defaultIntent="prospect"
        sourceLabel="Creation"
        onSaveProspect={props.onSave}
      />
    );
  }

  return <ProspectFormDialogLegacy {...props} prospect={props.prospect} />;
};

export default ProspectFormDialog;
