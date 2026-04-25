import type { ComponentProps, ReactNode } from "react";
import type { UseFormReturn } from "react-hook-form";
import { UserRound } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import type {
  OnboardingFormInput,
  OnboardingValues,
} from "./entityOnboarding.schema";
import { getDepartmentFromPostalCode } from "./entityOnboarding.utils";

const inputGhostClasses =
  "h-10 rounded-md border border-border bg-surface-1/60 px-3 text-base font-medium text-foreground shadow-sm transition-[border-color,background-color,box-shadow] hover:border-border-strong hover:bg-background focus-visible:border-primary focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-primary/20 sm:text-[14px]";
const labelClasses =
  "text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground";

interface EntityOnboardingIndividualSearchStepProps {
  form: UseFormReturn<OnboardingFormInput, unknown, OnboardingValues>;
  values: OnboardingValues;
}

interface IndividualFieldProps
  extends Omit<ComponentProps<typeof Input>, "className" | "id"> {
  error?: ReactNode;
  hint?: ReactNode;
  id: string;
  inputClassName?: string;
  label: string;
  wrapperClassName?: string;
}

const IndividualField = ({
  error,
  hint,
  id,
  inputClassName,
  label,
  wrapperClassName,
  ...inputProps
}: IndividualFieldProps) => (
  <div className={cn("space-y-2", wrapperClassName)}>
    <label htmlFor={id} className={labelClasses}>
      {label}
    </label>
    <Input
      id={id}
      density="dense"
      {...inputProps}
      className={cn(inputGhostClasses, inputClassName)}
    />
    {error ? <p className="text-xs text-destructive">{error}</p> : null}
    {hint ? <p className="text-xs text-muted-foreground/60">{hint}</p> : null}
  </div>
);

const EntityOnboardingIndividualSearchStep = ({
  form,
  values,
}: EntityOnboardingIndividualSearchStepProps) => {
  const { errors } = form.formState;

  return (
    <div className="flex h-full flex-col space-y-10">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <UserRound className="size-4" />
          <span>Client particulier</span>
        </div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          Identite du particulier
        </h2>
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
          Saisis les coordonnees. La verification des doublons se met a jour en
          temps reel dans le panneau de droite.
        </p>
      </div>

      <div className="grid gap-x-12 gap-y-8 md:grid-cols-2">
        <IndividualField
          id="individual-last-name"
          label="Nom"
          error={errors.last_name?.message}
          {...form.register("last_name")}
        />
        <IndividualField
          id="individual-first-name"
          label="Prenom"
          error={errors.first_name?.message}
          {...form.register("first_name")}
        />
        <IndividualField
          id="individual-phone"
          type="tel"
          autoComplete="tel"
          inputClassName="font-mono tabular-nums"
          label="Telephone"
          error={errors.phone?.message}
          {...form.register("phone")}
        />
        <IndividualField
          id="individual-email"
          type="email"
          autoComplete="email"
          spellCheck={false}
          label="Email"
          error={errors.email?.message}
          {...form.register("email")}
        />

        <div className="space-y-2">
          <label htmlFor="individual-postal-code" className={labelClasses}>
            Code postal
          </label>
          <Input
            id="individual-postal-code"
            inputMode="numeric"
            autoComplete="postal-code"
            spellCheck={false}
            density="dense"
            value={values.postal_code}
            onChange={(event) => {
              const digits = event.target.value.replace(/\D/g, "").slice(0, 5);
              form.setValue("postal_code", digits, {
                shouldDirty: true,
                shouldValidate: true,
              });
              form.setValue(
                "department",
                digits.length >= 2 ? getDepartmentFromPostalCode(digits) : "",
                { shouldDirty: true },
              );
            }}
            className={cn(inputGhostClasses, "font-mono tabular-nums")}
          />
          {errors.postal_code?.message ? (
            <p className="text-xs text-destructive">
              {errors.postal_code.message}
            </p>
          ) : null}
        </div>

        <IndividualField
          id="individual-city"
          autoComplete="address-level2"
          label="Ville"
          error={errors.city?.message}
          {...form.register("city")}
        />
        <IndividualField
          id="individual-address"
          autoComplete="street-address"
          wrapperClassName="md:col-span-2"
          label="Adresse"
          hint="Optionnelle. Peut etre completee a l'etape suivante."
          {...form.register("address")}
        />
      </div>
    </div>
  );
};

export default EntityOnboardingIndividualSearchStep;
