import type { UseFormReturn } from "react-hook-form";
import { Building2, UserRound } from "lucide-react";

import type {
  DirectoryCommercialOption,
  DirectoryCompanySearchResult,
} from '../../../../shared/schemas/system/directory.schema';
import type { Agency, UserRole } from "@/types";
import { Input } from '../ui/inputs/basic/Input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/inputs/selects/Select';
import { Textarea } from '../ui/inputs/basic/Textarea';
import { cn } from "@/lib/utils";
import {
  EntityRecordWizardField as FieldShell,
  EntityRecordWizardSection,
  wizardInputClasses,
  wizardReadOnlyInputClasses,
} from "@/components/entity-record-wizard/EntityRecordWizardFields";
import type {
  OnboardingFormInput,
  OnboardingValues,
} from "./entityOnboarding.schema";
import type { DuplicateMatch } from "./entityOnboarding.types";
import { getDepartmentFromPostalCode } from "./entityOnboarding.utils";

const inputGhostClasses = wizardInputClasses;
const selectGhostClasses = wizardInputClasses;

interface EntityOnboardingDetailsStepProps {
  form: UseFormReturn<OnboardingFormInput, unknown, OnboardingValues>;
  values: OnboardingValues;
  effectiveIntent: "client" | "prospect";
  isIndividualClient: boolean;
  agencies: Agency[];
  commercials: DirectoryCommercialOption[];
  userRole: UserRole;
  selectedCompany: DirectoryCompanySearchResult | undefined;
  duplicateMatches: DuplicateMatch[];
  remainingRequiredFields: string[];
}

const EntityOnboardingDetailsStep = ({
  form,
  values,
  effectiveIntent,
  isIndividualClient,
  agencies,
  commercials,
  userRole,
}: EntityOnboardingDetailsStepProps) => {
  const { errors } = form.formState;

  return (
    <div className="flex flex-col gap-4 pb-8">
      <EntityRecordWizardSection
        title={isIndividualClient ? "Identité et contact principal" : "Identité & Adresse"}
        eyebrow={isIndividualClient ? "Particulier" : "Entreprise"}
      >
        <div className="mb-4 flex items-center gap-2 text-sm text-foreground font-semibold">
          {isIndividualClient ? (
            <UserRound className="size-4 text-primary" />
          ) : (
            <Building2 className="size-4 text-primary" />
          )}
        </div>

        <div className="grid gap-x-6 gap-y-4 md:grid-cols-2">
          {isIndividualClient ? (
            <>
              <FieldShell
                htmlFor="last_name"
                label="Nom"
                error={errors.last_name?.message}
              >
                <Input
                  id="last_name"
                  {...form.register("last_name")}
                  className={inputGhostClasses}
                />
              </FieldShell>
              <FieldShell
                htmlFor="first_name"
                label="Prénom"
                error={errors.first_name?.message}
              >
                <Input
                  id="first_name"
                  {...form.register("first_name")}
                  className={inputGhostClasses}
                />
              </FieldShell>
              <FieldShell
                htmlFor="phone"
                label="Téléphone"
                error={errors.phone?.message}
              >
                <Input
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  {...form.register("phone")}
                  className={cn(inputGhostClasses, "font-mono tabular-nums")}
                />
              </FieldShell>
              <FieldShell
                htmlFor="email"
                label="Email"
                error={errors.email?.message}
              >
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  spellCheck={false}
                  {...form.register("email")}
                  className={inputGhostClasses}
                />
              </FieldShell>
            </>
          ) : (
            <FieldShell
              htmlFor="name"
              label="Nom de la société"
              error={errors.name?.message}
              className="md:col-span-2"
            >
              <Input
                id="name"
                {...form.register("name")}
                className={cn(inputGhostClasses, "text-base font-medium")}
              />
            </FieldShell>
          )}

          <FieldShell
            htmlFor="address"
            label="Adresse"
            error={errors.address?.message}
            className="md:col-span-2"
          >
            <Input
              id="address"
              autoComplete="street-address"
              {...form.register("address")}
              className={inputGhostClasses}
            />
          </FieldShell>

          <FieldShell
            htmlFor="postal_code"
            label="Code postal"
            error={errors.postal_code?.message}
          >
            <Input
              id="postal_code"
              value={values.postal_code ?? ""}
              spellCheck={false}
              onChange={(event) => {
                const digits = event.target.value
                  .replace(/\D/g, "")
                  .slice(0, 5);
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
          </FieldShell>

          <FieldShell htmlFor="city" label="Ville" error={errors.city?.message}>
            <Input
              id="city"
              autoComplete="address-level2"
              {...form.register("city")}
              className={inputGhostClasses}
            />
          </FieldShell>

          <FieldShell
            htmlFor="department"
            label="Département"
            error={errors.department?.message}
          >
            <Input
              id="department"
              value={values.department ?? ""}
              readOnly
              className={cn(inputGhostClasses, wizardReadOnlyInputClasses)}
            />
          </FieldShell>

          <FieldShell label="Agence" error={errors.agency_id?.message}>
            <Select
              value={values.agency_id ?? ""}
              onValueChange={(nextValue) =>
                form.setValue("agency_id", nextValue, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
              disabled={userRole === "tcs"}
            >
              <SelectTrigger aria-label="Agence" className={selectGhostClasses}>
                <SelectValue placeholder="Sélectionner une agence" />
              </SelectTrigger>
              <SelectContent>
                {agencies.map((agency) => (
                  <SelectItem key={agency.id} value={agency.id}>
                    {agency.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldShell>

          <FieldShell htmlFor="notes" label="Notes" className="md:col-span-2">
            <Textarea
              id="notes"
              {...form.register("notes")}
              className="min-h-[80px] rounded-md border border-border bg-background p-3 text-[13px] font-medium shadow-none transition-[border-color,background-color,box-shadow] hover:border-border-strong focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
            />
          </FieldShell>
        </div>
      </EntityRecordWizardSection>

      {!isIndividualClient && (
        <EntityRecordWizardSection title="Données officielles" eyebrow="Base SIRENE">
          <div className="grid gap-x-6 gap-y-4 md:grid-cols-3">
            <FieldShell htmlFor="siret" label="SIRET">
              <Input
                id="siret"
                spellCheck={false}
                {...form.register("siret")}
                className={cn(inputGhostClasses, "font-mono tabular-nums")}
              />
            </FieldShell>
            <FieldShell htmlFor="siren" label="SIREN">
              <Input
                id="siren"
                spellCheck={false}
                {...form.register("siren")}
                className={cn(inputGhostClasses, "font-mono tabular-nums")}
              />
            </FieldShell>
            <FieldShell htmlFor="naf_code" label="Code NAF">
              <Input
                id="naf_code"
                spellCheck={false}
                {...form.register("naf_code")}
                className={cn(inputGhostClasses, "font-mono tabular-nums")}
              />
            </FieldShell>
            <FieldShell
              htmlFor="official_name"
              label="Nom officiel"
              className="md:col-span-2"
            >
              <Input
                id="official_name"
                {...form.register("official_name")}
                className={inputGhostClasses}
              />
            </FieldShell>
            <FieldShell htmlFor="data_source" label="Source">
              <Input
                id="data_source"
                value={
                  values.official_data_source
                    ? "Recherche API"
                    : "Saisie manuelle"
                }
                readOnly
                className={cn(inputGhostClasses, wizardReadOnlyInputClasses)}
              />
            </FieldShell>
          </div>
        </EntityRecordWizardSection>
      )}

      {effectiveIntent === "client" && (
        <EntityRecordWizardSection title="Compte client" eyebrow="Référentiel CIR">
          <div className="grid gap-x-6 gap-y-4 md:grid-cols-2">
            <FieldShell
              htmlFor="client_number"
              label="Numéro de compte"
              error={errors.client_number?.message}
            >
              <Input
                id="client_number"
                value={values.client_number ?? ""}
                spellCheck={false}
                onChange={(event) =>
                  form.setValue(
                    "client_number",
                    event.target.value.replace(/\D/g, "").slice(0, 10),
                    { shouldDirty: true, shouldValidate: true },
                  )
                }
                className={cn(inputGhostClasses, "font-mono tabular-nums")}
              />
            </FieldShell>

            <FieldShell label="Type de compte">
              {isIndividualClient ? (
                <Input
                  aria-label="Type de compte"
                  value="Comptant"
                  readOnly
                  className={cn(inputGhostClasses, wizardReadOnlyInputClasses)}
                />
              ) : (
                <Select
                  value={values.account_type ?? "term"}
                  onValueChange={(nextValue: "term" | "cash") =>
                    form.setValue("account_type", nextValue, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                >
                  <SelectTrigger
                    aria-label="Type de compte"
                    className={selectGhostClasses}
                  >
                    <SelectValue placeholder="Type de compte" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="term">Compte à terme</SelectItem>
                    <SelectItem value="cash">Comptant</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </FieldShell>

            <FieldShell label="Commercial CIR" className="md:col-span-2">
              {isIndividualClient ? (
                <Input
                  aria-label="Commercial CIR"
                  value="Aucun commercial affecté"
                  readOnly
                  className={cn(inputGhostClasses, wizardReadOnlyInputClasses)}
                />
              ) : (
                <Select
                  value={values.cir_commercial_id || "__none__"}
                  onValueChange={(nextValue) =>
                    form.setValue(
                      "cir_commercial_id",
                      nextValue === "__none__" ? "" : nextValue,
                      { shouldDirty: true, shouldValidate: true },
                    )
                  }
                >
                  <SelectTrigger
                    aria-label="Commercial CIR"
                    className={selectGhostClasses}
                  >
                    <SelectValue placeholder="Aucun commercial affecté" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">
                      Aucun commercial affecté
                    </SelectItem>
                    {commercials.map((commercial) => (
                      <SelectItem key={commercial.id} value={commercial.id}>
                        {commercial.display_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </FieldShell>
          </div>
        </EntityRecordWizardSection>
      )}
    </div>
  );
};

export default EntityOnboardingDetailsStep;
