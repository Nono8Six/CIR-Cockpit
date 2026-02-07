import type { RefObject } from 'react';
import type { FieldErrors, UseFormSetValue } from 'react-hook-form';

import type { InteractionFormValues } from '@/schemas/interactionSchema';

type CockpitRelationSectionProps = {
  labelStyle: string;
  errors: FieldErrors<InteractionFormValues>;
  setValue: UseFormSetValue<InteractionFormValues>;
  relationOptions: string[];
  entityType: string;
  relationButtonRef: RefObject<HTMLButtonElement | null>;
};

const CockpitRelationSection = ({
  labelStyle,
  errors,
  setValue,
  relationOptions,
  entityType,
  relationButtonRef
}: CockpitRelationSectionProps) => (
  <div className="space-y-2">
    <label className={labelStyle}>Relation</label>
    <div className="flex flex-wrap bg-slate-100 p-1 rounded-md gap-1">
      {relationOptions.map((option, index) => (
        <button
          key={option}
          type="button"
          ref={index === 0 ? relationButtonRef : undefined}
          onClick={() => setValue('entity_type', option, { shouldValidate: true, shouldDirty: true })}
          className={`px-2 py-0.5 text-xs font-semibold rounded-sm transition-colors whitespace-nowrap ${
            entityType === option
              ? 'bg-white text-cir-red shadow-sm ring-1 ring-cir-red/20'
              : 'text-slate-600 hover:text-cir-red'
          }`}
        >
          {option}
        </button>
      ))}
    </div>
    {errors.entity_type ? (
      <p className="text-[11px] text-red-600" role="status" aria-live="polite">
        {errors.entity_type.message}
      </p>
    ) : null}
  </div>
);

export default CockpitRelationSection;
