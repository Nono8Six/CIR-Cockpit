import type { RefObject } from 'react';
import type { FieldErrors, UseFormRegisterReturn, UseFormSetValue } from 'react-hook-form';

import type { RelationMode } from '@/constants/relations';
import type { InteractionFormValues } from '@/schemas/interactionSchema';
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
    {relationMode !== 'internal' && relationMode !== 'solicitation' && relationMode !== 'client' && (
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
        {relationMode === 'prospect' && (
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
