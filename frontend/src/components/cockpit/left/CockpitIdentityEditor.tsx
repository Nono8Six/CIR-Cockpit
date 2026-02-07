import type { RefObject } from 'react';
import type { FieldErrors, UseFormRegisterReturn, UseFormSetValue } from 'react-hook-form';

import type { InteractionFormValues } from '@/schemas/interactionSchema';
import CockpitCompanyCityField from './CockpitCompanyCityField';
import CockpitCompanyInput from './CockpitCompanyInput';
import CockpitIdentityHints from './CockpitIdentityHints';

type CockpitIdentityEditorProps = {
  errors: FieldErrors<InteractionFormValues>;
  isInternalRelation: boolean;
  isSolicitationRelation: boolean;
  isClientRelation: boolean;
  isProspectRelation: boolean;
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
  isInternalRelation,
  isSolicitationRelation,
  isClientRelation,
  isProspectRelation,
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
      isInternalRelation={isInternalRelation}
      isSolicitationRelation={isSolicitationRelation}
      isClientRelation={isClientRelation}
    />
    {!isInternalRelation && !isSolicitationRelation && !isClientRelation && (
      <>
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
        {isProspectRelation && (
          <CockpitCompanyCityField
            field={companyCityField}
            value={companyCity}
            error={errors.company_city?.message}
          />
        )}
      </>
    )}
  </div>
);

export default CockpitIdentityEditor;
