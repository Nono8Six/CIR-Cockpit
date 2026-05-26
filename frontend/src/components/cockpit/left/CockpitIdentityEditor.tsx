import type { RefObject } from 'react';
import type { FieldErrors, UseFormRegisterReturn, UseFormSetValue } from 'react-hook-form';

import type { RelationMode } from '@/constants/relations';
import type { InteractionFormValues } from '../../../../../shared/schemas/interaction/interaction.schema';
import CockpitCompanyCityField from './CockpitCompanyCityField';
import CockpitCompanyInput from './CockpitCompanyInput';
import CockpitIdentityHints from './CockpitIdentityHints';

type CockpitIdentityEditorProps = {
  errors: FieldErrors<InteractionFormValues>;
  relationMode: RelationMode;
  companyField: UseFormRegisterReturn;
  companyCityField: UseFormRegisterReturn;
  companyName: string;
  companyCity: string;
  showSuggestions: boolean;
  onShowSuggestionsChange: (show: boolean) => void;
  companySuggestions: string[];
  companyInputRef: RefObject<HTMLInputElement | null>;
  setValue: UseFormSetValue<InteractionFormValues>;
};

const CockpitIdentityEditor = ({
  errors,
  relationMode,
  companyField,
  companyCityField,
  companyName,
  companyCity,
  showSuggestions,
  onShowSuggestionsChange,
  companySuggestions,
  companyInputRef,
  setValue
}: CockpitIdentityEditorProps) => (
  <div className="space-y-2">
    <CockpitIdentityHints
      relationMode={relationMode}
    />
    {relationMode !== 'internal' && relationMode !== 'client' && relationMode !== 'individual' && (
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_2px_8px_-1px_rgba(0,0,0,0.02)] transition-all duration-200 focus-within:border-primary/50 focus-within:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.03)]">
        <CockpitCompanyInput
          errors={errors}
          companyField={companyField}
          companyName={companyName}
          showSuggestions={showSuggestions}
          onShowSuggestionsChange={onShowSuggestionsChange}
          companySuggestions={companySuggestions}
          companyInputRef={companyInputRef}
          setValue={setValue}
          isProspect={relationMode === 'prospect'}
        />
        {relationMode === 'prospect' && (
          <CockpitCompanyCityField
            field={companyCityField}
            value={companyCity}
            error={errors.company_city?.message}
          />
        )}
      </div>
    )}
  </div>
);

export default CockpitIdentityEditor;
