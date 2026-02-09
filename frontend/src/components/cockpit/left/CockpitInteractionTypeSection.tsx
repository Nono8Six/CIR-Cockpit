import type { RefObject } from 'react';
import type { FieldErrors, UseFormSetValue } from 'react-hook-form';

import type { InteractionFormValues } from '@/schemas/interactionSchema';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type CockpitInteractionTypeSectionProps = {
  labelStyle: string;
  errors: FieldErrors<InteractionFormValues>;
  interactionType: string;
  hasInteractionTypes: boolean;
  interactionTypeHelpId: string;
  interactionTypeRef: RefObject<HTMLButtonElement | null>;
  interactionTypes: string[];
  setValue: UseFormSetValue<InteractionFormValues>;
};

const CockpitInteractionTypeSection = ({
  labelStyle,
  errors,
  interactionType,
  hasInteractionTypes,
  interactionTypeHelpId,
  interactionTypeRef,
  interactionTypes,
  setValue
}: CockpitInteractionTypeSectionProps) => (
  <div className="space-y-1">
    <label className={labelStyle} htmlFor="interaction-type">Type d&apos;interaction</label>
    <Select
      value={interactionType}
      onValueChange={(value) =>
        setValue('interaction_type', value, { shouldValidate: true, shouldDirty: true })
      }
      disabled={!hasInteractionTypes}
    >
      <SelectTrigger
        id="interaction-type"
        ref={interactionTypeRef}
        aria-describedby={hasInteractionTypes ? undefined : interactionTypeHelpId}
        className="h-8 w-fit min-w-[180px] max-w-[260px] rounded-md border-slate-200 bg-white text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:border-cir-red/40 hover:bg-cir-red/5 focus:ring-2 focus:ring-cir-red/30 data-[state=open]:border-cir-red/50"
      >
        <SelectValue placeholder="Choisir..." />
      </SelectTrigger>
      <SelectContent className="max-h-64">
        {interactionTypes.map((type) => (
          <SelectItem key={type} value={type} className="text-xs font-medium">
            {type}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
    {!hasInteractionTypes && (
      <p id={interactionTypeHelpId} className="text-xs text-amber-600 mt-1">
        Ajoutez des types d&apos;interaction dans Parametres.
      </p>
    )}
    {errors.interaction_type && (
      <p className="text-xs text-red-600 mt-1" role="status" aria-live="polite">
        {errors.interaction_type.message}
      </p>
    )}
  </div>
);

export default CockpitInteractionTypeSection;
