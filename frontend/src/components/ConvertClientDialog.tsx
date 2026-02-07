import { Dialog, DialogContent } from './ui/dialog';
import ConvertClientHeader from './convert-client/ConvertClientHeader';
import ConvertClientCompanyCard from './convert-client/ConvertClientCompanyCard';
import ConvertClientFields from './convert-client/ConvertClientFields';
import ConvertClientFooter from './convert-client/ConvertClientFooter';
import { useConvertClientDialog } from '@/hooks/useConvertClientDialog';
import { AccountType } from '@/types';
import { ConvertClientPayload } from '@/services/entities/convertEntityToClient';

export type ConvertClientEntity = {
  id: string;
  name: string;
  client_number?: string | null;
  account_type?: AccountType | null;
};

interface ConvertClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entity: ConvertClientEntity | null;
  onConvert: (payload: ConvertClientPayload) => Promise<void>;
}

const ConvertClientDialog = ({ open, onOpenChange, entity, onConvert }: ConvertClientDialogProps) => {
  const {
    errors,
    isSubmitting,
    clientNumber,
    accountType,
    clientNumberField,
    accountTypeField,
    handleClientNumberChange,
    handleConvert
  } = useConvertClientDialog({ open, entity, onConvert });

  if (!entity) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="bg-slate-900/20 backdrop-blur-[2px]"
        className="w-[min(92vw,640px)] max-w-2xl p-0 overflow-hidden rounded-2xl border border-slate-200/70 shadow-2xl"
      >
        <ConvertClientHeader />
        <form onSubmit={handleConvert} className="space-y-5 px-6 py-5">
          <ConvertClientCompanyCard name={entity.name} />
          <ConvertClientFields
            clientNumber={clientNumber}
            accountType={accountType}
            clientNumberField={clientNumberField}
            accountTypeField={accountTypeField}
            errors={errors}
            onClientNumberChange={handleClientNumberChange}
          />
          <ConvertClientFooter isSubmitting={isSubmitting} onCancel={() => onOpenChange(false)} />
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ConvertClientDialog;
