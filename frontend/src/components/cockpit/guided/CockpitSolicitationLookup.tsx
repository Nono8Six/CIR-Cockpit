import type { ChangeEvent, RefObject } from 'react';
import type { FieldErrors, UseFormRegisterReturn, UseFormSetValue } from 'react-hook-form';
import { History, PhoneCall } from 'lucide-react';

import { useCockpitPhoneLookup } from '@/hooks/useCockpitPhoneLookup';
import { formatDate } from '@/utils/date/formatDate';
import { Button } from '@/components/ui/button';
import type { InteractionFormValues } from 'shared/schemas/interaction.schema';
import CockpitCompanyInput from '../left/CockpitCompanyInput';
import CockpitContactPhoneField from '../left/CockpitContactPhoneField';

type CockpitSolicitationLookupProps = {
  activeAgencyId: string | null;
  errors: FieldErrors<InteractionFormValues>;
  companyField: UseFormRegisterReturn;
  companyName: string;
  showSuggestions: boolean;
  onShowSuggestionsChange: (show: boolean) => void;
  companySuggestions: string[];
  companyInputRef: RefObject<HTMLInputElement | null>;
  contactPhoneField: UseFormRegisterReturn;
  contactPhone: string;
  onContactPhoneChange: (event: ChangeEvent<HTMLInputElement>) => void;
  setValue: UseFormSetValue<InteractionFormValues>;
  onComplete: () => void;
};

const CockpitSolicitationLookup = ({
  activeAgencyId,
  errors,
  companyField,
  companyName,
  showSuggestions,
  onShowSuggestionsChange,
  companySuggestions,
  companyInputRef,
  contactPhoneField,
  contactPhone,
  onContactPhoneChange,
  setValue,
  onComplete
}: CockpitSolicitationLookupProps) => {
  const lookup = useCockpitPhoneLookup(activeAgencyId, contactPhone, true);
  const canContinue = companyName.trim().length > 0 && lookup.normalizedPhone.length >= 6;

  return (
    <div className="space-y-4" data-testid="cockpit-solicitation-lookup">
      <div className="grid gap-3 sm:grid-cols-2">
        <CockpitCompanyInput
          errors={errors}
          companyField={companyField}
          companyName={companyName}
          showSuggestions={showSuggestions}
          onShowSuggestionsChange={onShowSuggestionsChange}
          companySuggestions={companySuggestions}
          companyInputRef={companyInputRef}
          setValue={setValue}
        />
        <CockpitContactPhoneField
          phoneField={contactPhoneField}
          phone={contactPhone}
          onPhoneChange={onContactPhoneChange}
          phoneError={errors.contact_phone?.message}
        />
      </div>
      {lookup.data?.matches.length ? (
        <div className="rounded-md border border-border bg-surface-1/70">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <History size={13} aria-hidden="true" />
            Historique numero
          </div>
          <div className="divide-y divide-border">
            {lookup.data.matches.map((match) => (
              <button
                key={match.id}
                type="button"
                onClick={() => {
                  if (!companyName.trim()) {
                    setValue('company_name', match.company_name, { shouldDirty: true, shouldValidate: true });
                  }
                  setValue('contact_name', match.contact_name, { shouldDirty: true, shouldValidate: true });
                  setValue('contact_phone', match.contact_phone ?? contactPhone, { shouldDirty: true, shouldValidate: true });
                  onComplete();
                }}
                className="grid w-full gap-1 px-3 py-2 text-left transition-colors hover:bg-card sm:grid-cols-[minmax(0,1fr)_auto]"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-foreground">{match.company_name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{match.subject}</span>
                </span>
                <span className="text-xs font-medium text-muted-foreground">{formatDate(match.last_action_at)}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <div className="flex justify-end">
        <Button type="button" size="sm" onClick={onComplete} disabled={!canContinue} className="gap-1.5">
          <PhoneCall size={13} />
          Continuer
        </Button>
      </div>
    </div>
  );
};

export default CockpitSolicitationLookup;
