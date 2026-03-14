import type { ReactNode } from "react";
import type { UseFormReturn } from "react-hook-form";
import { Building2, UserRound } from "lucide-react";

import type {
  DirectoryCommercialOption,
  DirectoryCompanySearchResult,
} from "shared/schemas/directory.schema";
import type { Agency, UserRole } from "@/types";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type {
  OnboardingFormInput,
  OnboardingValues,
} from "./entityOnboarding.schema";
import type { DuplicateMatch } from "./entityOnboarding.types";
import { getDepartmentFromPostalCode } from "./entityOnboarding.utils";

interface FieldShellProps {
  label: string;
  htmlFor?: string;
  helper?: string;
  error?: string;
  className?: string;
  children: ReactNode;
}

const labelClasses =
  "text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground";
const inputGhostClasses =
  "h-10 rounded-md border border-border bg-surface-1/60 px-3 text-base font-medium text-foreground shadow-sm hover:border-border-strong hover:bg-background focus-visible:border-primary focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-primary/20 transition-all sm:text-[14px]";
const selectGhostClasses =
  "h-10 rounded-md border border-border bg-surface-1/60 px-3 text-base font-medium text-foreground shadow-sm hover:border-border-strong hover:bg-background focus:ring-2 focus:ring-primary/20 transition-all sm:text-[14px]";

const FieldShell = ({
  label,
  htmlFor,
  helper,
  error,
  className,
  children,
}: FieldShellProps) => (
  <div className={className}>
    <div className="grid gap-1">
      <label htmlFor={htmlFor} className={labelClasses}>
        {label}
      </label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {!error && helper ? (
        <p className="text-xs text-muted-foreground/60">{helper}</p>
      ) : null}
    </div>
  </div>
);

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
    <div className="flex h-full flex-col space-y-12 pb-8">
      {/* SECTION IDENTITE */}
      <section className="space-y-6">
        <div className="flex items-center gap-2 border-b border-border-subtle pb-2 text-sm text-foreground font-medium">
          {isIndividualClient ? (
            <UserRound className="size-4" />
          ) : (
            <Building2 className="size-4" />
          )}
          <h3>
            {isIndividualClient
              ? "Identite et contact principal"
              : "Identite & Adresse"}
          </h3>
        </div>

        <div className="grid gap-x-12 gap-y-8 md:grid-cols-2">
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
                label="Prenom"
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
                label="Telephone"
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
              label="Nom de la societe"
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

          <FieldShell htmlFor="department" label="Departement">
            <Input
              id="department"
              value={values.department ?? ""}
              readOnly
              className={cn(inputGhostClasses, "text-muted-foreground")}
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
                <SelectValue placeholder="Selectionner une agence" />
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
              className="min-h-[80px] rounded-md border border-border-subtle bg-surface-1/30 p-3 text-base shadow-sm hover:border-border hover:bg-background focus-visible:border-primary focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-primary/20 transition-[border-color,background-color,box-shadow] sm:text-[14px]"
            />
          </FieldShell>
        </div>
      </section>

      {/* SECTION DONNEES OFFICIELLES (Société uniquement) */}
      {!isIndividualClient && (
        <section className="space-y-6">
          <div className="flex items-center gap-2 border-b border-border-subtle pb-2 text-sm text-foreground font-medium">
            <h3>Donnees officielles</h3>
          </div>
          <div className="grid gap-x-12 gap-y-8 md:grid-cols-3">
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
                className={cn(inputGhostClasses, "text-muted-foreground")}
              />
            </FieldShell>
          </div>
        </section>
      )}

      {/* SECTION COMPTE CLIENT */}
      {effectiveIntent === "client" && (
        <section className="space-y-6">
          <div className="flex items-center gap-2 border-b border-border-subtle pb-2 text-sm text-foreground font-medium">
            <h3>Compte client</h3>
          </div>
          <div className="grid gap-x-12 gap-y-8 md:grid-cols-2">
            <FieldShell
              htmlFor="client_number"
              label="Numero de compte"
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
                  className={cn(inputGhostClasses, "text-muted-foreground")}
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
                    <SelectItem value="term">Compte a terme</SelectItem>
                    <SelectItem value="cash">Comptant</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </FieldShell>

            <FieldShell label="Commercial CIR" className="md:col-span-2">
              {isIndividualClient ? (
                <Input
                  aria-label="Commercial CIR"
                  value="Aucun commercial affecte"
                  readOnly
                  className={cn(inputGhostClasses, "text-muted-foreground")}
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
                    <SelectValue placeholder="Aucun commercial affecte" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">
                      Aucun commercial affecte
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
        </section>
      )}
    </div>
  );
};

export default EntityOnboardingDetailsStep;
