import type { RefObject } from 'react';
import type { FieldErrors, UseFormRegisterReturn, UseFormSetValue } from 'react-hook-form';

import type { RelationMode } from '@/constants/relations';
import type { Entity } from '@/types';
import type { InteractionFormValues } from '@/schemas/interactionSchema';
import CockpitFieldError from './CockpitFieldError';
import CockpitIdentityEditor from './CockpitIdentityEditor';
import CockpitSelectedEntityCard from './CockpitSelectedEntityCard';

type CockpitIdentitySectionProps = {
  labelStyle: string;
  errors: FieldErrors<InteractionFormValues>;
  selectedEntity: Entity | null;
  selectedEntityMeta: string;
  canConvertToClient: boolean;
  onOpenConvertDialog: () => void;
  onClearSelectedEntity: () => void;
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

const CockpitIdentitySection = ({
  labelStyle,
  errors,
  selectedEntity,
  selectedEntityMeta,
  canConvertToClient,
  onOpenConvertDialog,
  onClearSelectedEntity,
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
}: CockpitIdentitySectionProps) => (
  <div className="space-y-2">
    <label className={labelStyle}>Identite</label>
    {selectedEntity ? (
      <CockpitSelectedEntityCard
        selectedEntity={selectedEntity}
        selectedEntityMeta={selectedEntityMeta}
        canConvertToClient={canConvertToClient}
        onOpenConvertDialog={onOpenConvertDialog}
        onClearSelectedEntity={onClearSelectedEntity}
      />
    ) : (
      <CockpitIdentityEditor
        errors={errors}
        relationMode={relationMode}
        companyField={companyField}
        companyCityField={companyCityField}
        companyName={companyName}
        companyCity={companyCity}
        showSuggestions={showSuggestions}
        onShowSuggestionsChange={onShowSuggestionsChange}
        companySuggestions={companySuggestions}
        companyInputRef={companyInputRef}
        setValue={setValue}
      />
    )}
    <CockpitFieldError message={errors.entity_id?.message} />
  </div>
);

export default CockpitIdentitySection;
