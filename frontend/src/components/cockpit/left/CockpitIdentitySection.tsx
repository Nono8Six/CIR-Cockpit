import type { RefObject } from 'react';
import type { FieldErrors, UseFormRegisterReturn, UseFormSetValue } from 'react-hook-form';

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

const CockpitIdentitySection = ({
  labelStyle,
  errors,
  selectedEntity,
  selectedEntityMeta,
  canConvertToClient,
  onOpenConvertDialog,
  onClearSelectedEntity,
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
        isInternalRelation={isInternalRelation}
        isSolicitationRelation={isSolicitationRelation}
        isClientRelation={isClientRelation}
        isProspectRelation={isProspectRelation}
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
