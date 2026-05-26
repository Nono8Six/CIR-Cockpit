import type { RefObject } from 'react';
import type { FieldErrors, UseFormRegisterReturn, UseFormSetValue } from 'react-hook-form';

import type { InteractionFormValues } from '../../../../../shared/schemas/interaction/interaction.schema';
import { Input } from '../../ui/inputs/basic/Input';
import { cn } from '@/lib/utils';

type CockpitCompanyInputProps = {
  errors: FieldErrors<InteractionFormValues>;
  companyField: UseFormRegisterReturn;
  companyName: string;
  showSuggestions: boolean;
  onShowSuggestionsChange: (show: boolean) => void;
  companySuggestions: string[];
  companyInputRef: RefObject<HTMLInputElement | null>;
  setValue: UseFormSetValue<InteractionFormValues>;
  isProspect?: boolean;
};

const CockpitCompanyInput = ({
  errors,
  companyField,
  companyName,
  showSuggestions,
  onShowSuggestionsChange,
  companySuggestions,
  companyInputRef,
  setValue,
  isProspect = false
}: CockpitCompanyInputProps) => {
  return (
    <div className={cn(
      "px-5 py-4 bg-card focus-within:bg-surface-1/30 transition-all duration-150 relative",
      isProspect && "border-b border-border/60"
    )}>
      <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground select-none block mb-1.5" htmlFor="company-input">
        Nom de la société *
      </label>
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
          placeholder="Nom de la société…"
          className="h-9 w-full min-w-0 text-[13px] font-semibold border-none bg-transparent p-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-none mt-1 placeholder:text-muted-foreground/75 text-foreground"
          aria-invalid={!!errors.company_name}
          aria-label="Nom de la société"
          autoComplete="organization"
        />
        {errors.company_name && (
          <p className="text-xs text-destructive mt-1 font-medium" role="status" aria-live="polite">
            {errors.company_name.message}
          </p>
        )}
        {showSuggestions && companyName.length > 1 && (
          <div className="absolute z-50 w-full bg-card border border-border shadow-lg rounded-xl mt-2 max-h-40 overflow-auto py-1.5 ring-1 ring-black/5">
            {companySuggestions.length === 0 ? (
              <div className="px-4 py-2.5 text-xs text-muted-foreground/80 italic font-medium">Nouvelle entrée</div>
            ) : (
              companySuggestions.map((company) => (
                <button
                  key={company}
                  type="button"
                  className="w-full text-left px-4 py-2 text-[13px] font-semibold hover:bg-surface-1 text-foreground focus-visible:outline-none focus-visible:bg-surface-1 cursor-pointer transition-colors duration-100"
                  onMouseDown={(event) => {
                    // Keep focus on the input until click runs, avoiding close/open race.
                    event.preventDefault();
                  }}
                  onClick={() => {
                    setValue('company_name', company, { shouldDirty: true, shouldValidate: true });
                    onShowSuggestionsChange(false);
                  }}
                  aria-label={`Sélectionner ${company}`}
                >
                  {company}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CockpitCompanyInput;
