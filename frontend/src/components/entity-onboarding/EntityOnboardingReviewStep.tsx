import { useState } from "react";
import { MapPin, UserRound, ShieldCheck, Building2, Copy, Check, AlertCircle } from "lucide-react";

import type { Agency } from "@/types";
import { Badge } from '../ui/data-display/Badge';
import type {
  DirectoryCommercialOption,
  DirectoryCompanySearchResult,
} from '../../../../shared/schemas/system/directory.schema';
import type { OnboardingValues } from "./entityOnboarding.schema";
import type { DuplicateMatch } from "./entityOnboarding.types";
import {
  formatOfficialDate,
  getAgencyLabel,
  getCompanySearchStatusLabel,
} from "./entityOnboarding.utils";
import { cn } from "@/lib/utils";
import { EntityRecordWizardSection } from "@/components/entity-record-wizard/EntityRecordWizardFields";

interface EntityOnboardingReviewStepProps {
  values: OnboardingValues;
  agencies: Agency[];
  effectiveIntent: "client" | "prospect";
  isIndividualClient: boolean;
  selectedCompany: DirectoryCompanySearchResult | undefined;
  duplicateMatches: DuplicateMatch[];
  commercials?: DirectoryCommercialOption[];
}

const ReviewField = ({
  label,
  value,
  copyable = false,
}: {
  label: string;
  value: string;
  copyable?: boolean;
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!value || value === "Non renseigné" || value === "Non renseignée" || value === "À renseigner") return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const isPlaceholder = !value || value === "Non renseigné" || value === "Non renseignée" || value === "À renseigner";

  return (
    <div className="group relative rounded-lg border border-border bg-surface-1/40 p-3.5 transition-all duration-200 hover:border-foreground/20 hover:bg-surface-1/85">
      <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 mb-1 select-none">
        {label}
      </span>
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "text-[13px] font-semibold select-all leading-tight break-words flex-1",
            isPlaceholder ? "text-muted-foreground/60 font-medium italic" : "text-foreground"
          )}
        >
          {value}
        </span>
        {copyable && !isPlaceholder && (
          <button
            type="button"
            onClick={handleCopy}
            aria-label={`Copier ${label}`}
            className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-1 rounded hover:bg-surface-3 text-muted-foreground hover:text-foreground"
            title="Copier"
          >
            {copied ? (
              <Check className="size-3.5 text-success animate-scale" />
            ) : (
              <Copy className="size-3.5" />
            )}
          </button>
        )}
      </div>
    </div>
  );
};

const EntityOnboardingReviewStep = ({
  values,
  agencies,
  effectiveIntent,
  isIndividualClient,
  selectedCompany,
  duplicateMatches = [],
  commercials = [],
}: EntityOnboardingReviewStepProps) => {
  const displayName = isIndividualClient
    ? [values.last_name, values.first_name]
        .map((entry) => entry.trim())
        .filter(Boolean)
        .join(" ")
    : values.name;
  const closedAt = formatOfficialDate(
    selectedCompany?.establishment_closed_at ?? null,
  );

  const commercialLabel = isIndividualClient
    ? "Non applicable (client particulier)"
    : values.cir_commercial_id
      ? (commercials.find((c) => c.id === values.cir_commercial_id)?.display_name ?? "Affecté")
      : "Non affecté";

  return (
    <div className="flex flex-col gap-4 pb-8">
      <div className="border border-border bg-card p-4 flex items-start gap-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-primary/20 bg-primary/10 text-primary">
          {isIndividualClient ? (
            <UserRound className="size-6" />
          ) : (
            <Building2 className="size-6" />
          )}
        </div>
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-foreground truncate">
              {displayName}
            </h2>
            <Badge
              variant="outline"
              density="dense"
              className={cn(
                "text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5",
                effectiveIntent === "client"
                  ? "border-primary/20 bg-primary/5 text-primary"
                  : "border-warning/30 bg-warning/5 text-warning-foreground"
              )}
            >
              {effectiveIntent === "client" ? "Client" : "Prospect"}
            </Badge>
            {isIndividualClient && (
              <Badge
                variant="outline"
                density="dense"
                className="text-[10px] uppercase tracking-wider border-border bg-surface-3 text-muted-foreground font-semibold px-2 py-0.5"
              >
                Particulier
              </Badge>
            )}
            {values.official_data_source && (
              <Badge
                variant="outline"
                density="dense"
                className="text-[10px] uppercase tracking-wider border-success/20 bg-success/5 text-success font-semibold px-2 py-0.5"
              >
                Source officielle
              </Badge>
            )}
          </div>
          <p className="text-[12px] leading-relaxed text-muted-foreground">
            Contrôle final avant enregistrement. Vérifie attentivement ces données, elles serviront de base pour le compte.
          </p>
        </div>
      </div>

      {duplicateMatches.length > 0 && (
        <div className="flex items-start gap-3 border border-warning/30 bg-warning/5 p-4 text-warning-foreground">
          <AlertCircle className="size-4 shrink-0 mt-0.5 text-warning" />
          <div className="text-[12px] leading-relaxed">
            <p className="font-bold">Doublons potentiels détectés ({duplicateMatches.length})</p>
            <p className="mt-0.5 opacity-90">
              Des fiches similaires existent déjà dans la base de données. Assure-toi qu&apos;il s&apos;agit bien d&apos;une nouvelle entité avant de valider.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <EntityRecordWizardSection title="Coordonnées" eyebrow="Adresse">
          <div className="mb-4 flex items-center gap-2 text-sm font-bold text-foreground">
            <MapPin className="size-4 text-primary" />
          </div>
          <div className="grid gap-3.5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <ReviewField
                label="Adresse"
                value={values.address || "Non renseignée"}
                copyable
              />
            </div>
            <ReviewField
              label="Ville & CP"
              value={
                [values.postal_code, values.city].filter(Boolean).join(" ") ||
                "Non renseignée"
              }
              copyable
            />
            <ReviewField
              label="Agence"
              value={getAgencyLabel(agencies, values.agency_id)}
            />
          </div>
        </EntityRecordWizardSection>

        {isIndividualClient ? (
          <EntityRecordWizardSection title="Contact principal" eyebrow="Particulier">
            <div className="mb-4 flex items-center gap-2 text-sm font-bold text-foreground">
              <UserRound className="size-4 text-primary" />
            </div>
            <div className="grid gap-3.5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <ReviewField
                  label="Nom complet"
                  value={
                    [values.first_name, values.last_name]
                      .filter(Boolean)
                      .join(" ") || "Non renseigné"
                  }
                  copyable
                />
              </div>
              <ReviewField
                label="Téléphone"
                value={values.phone || "Non renseigné"}
                copyable
              />
              <ReviewField
                label="Email"
                value={values.email || "Non renseigné"}
                copyable
              />
            </div>
          </EntityRecordWizardSection>
        ) : (
          <EntityRecordWizardSection title="Données officielles" eyebrow="Base SIRENE">
            <div className="mb-4 flex items-center gap-2 text-sm font-bold text-foreground">
              <ShieldCheck className="size-4 text-primary" />
            </div>
            <div className="grid gap-3.5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <ReviewField
                  label="Nom officiel"
                  value={values.official_name || "Non renseigné"}
                  copyable
                />
              </div>
              <ReviewField
                label="SIRET"
                value={values.siret || "Non renseigné"}
                copyable
              />
              <ReviewField
                label="SIREN"
                value={values.siren || "Non renseigné"}
                copyable
              />
              <ReviewField
                label="Code NAF"
                value={values.naf_code || "Non renseigné"}
                copyable
              />
              {selectedCompany ? (
                <ReviewField
                  label="Statut établissement"
                  value={
                    selectedCompany.establishment_status === "closed" && closedAt
                      ? `${getCompanySearchStatusLabel(selectedCompany.establishment_status)} le ${closedAt}`
                      : getCompanySearchStatusLabel(
                          selectedCompany.establishment_status,
                        )
                  }
                />
              ) : (
                <ReviewField
                  label="Statut établissement"
                  value="Non renseigné"
                />
              )}
            </div>
          </EntityRecordWizardSection>
        )}

        {effectiveIntent === "client" && (
          <EntityRecordWizardSection title="Compte client" eyebrow="Référentiel CIR" className="md:col-span-2">
            <div className="mb-4 flex items-center gap-2 text-sm font-bold text-foreground">
              <Building2 className="size-4 text-primary" />
            </div>
            <div className="grid gap-3.5 sm:grid-cols-3">
              <ReviewField
                label="Numéro client"
                value={values.client_number || "À renseigner"}
                copyable
              />
              <ReviewField
                label="Type de compte"
                value={
                  isIndividualClient
                    ? "Comptant"
                    : values.account_type === "cash"
                      ? "Comptant"
                      : "Compte à terme"
                }
              />
              <ReviewField
                label="Commercial CIR"
                value={commercialLabel}
              />
            </div>
          </EntityRecordWizardSection>
        )}
      </div>
    </div>
  );
};

export default EntityOnboardingReviewStep;
