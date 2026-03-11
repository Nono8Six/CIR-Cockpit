import type { ClientPayload } from '@/services/clients/saveClient';
import { AccountType } from '@/types';
import EntityOnboardingDialog from './EntityOnboardingDialog';

export type ConvertClientEntity = {
  id: string;
  name: string;
  address?: string | null;
  postal_code?: string | null;
  department?: string | null;
  city?: string | null;
  siret?: string | null;
  siren?: string | null;
  naf_code?: string | null;
  official_name?: string | null;
  official_data_source?: 'api-recherche-entreprises' | null;
  official_data_synced_at?: string | null;
  notes?: string | null;
  agency_id?: string | null;
  cir_commercial_id?: string | null;
  entity_type?: string | null;
  client_number?: string | null;
  account_type?: AccountType | null;
};

interface ConvertClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entity: ConvertClientEntity | null;
  onConvert: (payload: ClientPayload) => Promise<void>;
}

const ConvertClientDialog = ({ open, onOpenChange, entity, onConvert }: ConvertClientDialogProps) => {
  if (!entity) return null;

  return (
    <EntityOnboardingDialog
      open={open}
      onOpenChange={onOpenChange}
      agencies={[]}
      userRole="tcs"
      activeAgencyId={entity.agency_id ?? null}
      mode="convert"
      allowedIntents={['client']}
      initialEntity={entity}
      sourceLabel="Conversion"
      onSaveClient={onConvert}
      onSaveProspect={async () => undefined}
      onComplete={({ client_number }) => {
        if (!client_number) {
          return;
        }
      }}
    />
  );
};

export default ConvertClientDialog;
