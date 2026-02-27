import type { RefObject } from 'react';
import type { FieldErrors, UseFormRegisterReturn, UseFormSetValue } from 'react-hook-form';

import type { InteractionFormValues } from '@/schemas/interactionSchema';
import { Input } from '@/components/ui/input';

type CockpitCompanyInputProps = {
  errors: FieldErrors<InteractionFormValues>;
  companyField: UseFormRegisterReturn;
  companyName: string;
  showSuggestions: boolean;
  onShowSuggestionsChange: (show: boolean) => void;
  companySuggestions: string[];
  companyInputRef: RefObject<HTMLInputElement | null>;
  setValue: UseFormSetValue<InteractionFormValues>;
};

const CockpitCompanyInput = ({
  errors,
  companyField,
  companyName,
  showSuggestions,
  onShowSuggestionsChange,
  companySuggestions,
  companyInputRef,
  setValue
}: CockpitCompanyInputProps) => {
  return (
    <div className="relative">
      <Input
        id="company-input"
        type="text"
        {...companyField}
        ref={(node) => {
          companyField.ref(node);
          companyInputRef.current = node;
        }}
        value={companyName}
        onChange={(event) => {
          companyField.onChange(event);
          onShowSuggestionsChange(true);
        }}
        onBlur={() => onShowSuggestionsChange(false)}
        placeholder="Nom de la societe…"
        className="font-semibold"
        aria-invalid={!!errors.company_name}
        aria-label="Nom de la societe"
        autoComplete="organization"
      />
      {errors.company_name && (
        <p className="text-xs text-destructive mt-1" role="status" aria-live="polite">
          {errors.company_name.message}
        </p>
      )}
      {showSuggestions && companyName.length > 1 && (
        <div className="absolute z-50 w-full bg-card border border-border shadow-lg rounded-md mt-1 max-h-40 overflow-auto py-1">
          {companySuggestions.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground/80 italic">Nouvelle entree</div>
          ) : (
            companySuggestions.map((company) => (
              <button
                key={company}
                type="button"
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-surface-1 text-foreground focus-visible:outline-none focus-visible:bg-surface-1"
                onMouseDown={(event) => {
                  // Keep focus on the input until click runs, avoiding close/open race.
                  event.preventDefault();
                }}
                onClick={() => {
                  setValue('company_name', company, { shouldDirty: true, shouldValidate: true });
                  onShowSuggestionsChange(false);
                }}
                aria-label={`Selectionner ${company}`}
              >
                {company}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default CockpitCompanyInput;
