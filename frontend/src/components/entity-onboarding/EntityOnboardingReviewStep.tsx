import { MapPin, UserRound, ShieldCheck, Building2 } from "lucide-react";

import type { Agency } from "@/types";
import { Badge } from "@/components/ui/badge";
import type { DirectoryCompanySearchResult } from "shared/schemas/directory.schema";
import type { OnboardingValues } from "./entityOnboarding.schema";
import type { DuplicateMatch } from "./entityOnboarding.types";
import {
  formatOfficialDate,
  getAgencyLabel,
  getCompanySearchStatusLabel,
} from "./entityOnboarding.utils";

interface EntityOnboardingReviewStepProps {
  values: OnboardingValues;
  agencies: Agency[];
  effectiveIntent: "client" | "prospect";
  isIndividualClient: boolean;
  selectedCompany: DirectoryCompanySearchResult | undefined;
  duplicateMatches: DuplicateMatch[];
}

const ReviewRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-start justify-between gap-3 border-b border-border-subtle/50 py-3 last:border-b-0">
    <span className="text-[13px] text-muted-foreground">{label}</span>
    <span className="text-right text-[13px] font-medium text-foreground">
      {value}
    </span>
  </div>
);

const EntityOnboardingReviewStep = ({
  values,
  agencies,
  effectiveIntent,
  isIndividualClient,
  selectedCompany,
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

  return (
    <div className="flex h-full flex-col space-y-12 pb-8">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            {displayName}
          </h2>
          <Badge
            variant="secondary"
            className="text-[10px] uppercase tracking-widest"
          >
            {effectiveIntent === "client" ? "Client" : "Prospect"}
          </Badge>
          {isIndividualClient && (
            <Badge
              variant="outline"
              className="text-[10px] uppercase tracking-widest"
            >
              Particulier
            </Badge>
          )}
          {values.official_data_source && (
            <Badge
              variant="outline"
              className="text-[10px] uppercase tracking-widest border-success/20 bg-success/5 text-success"
            >
              Source officielle
            </Badge>
          )}
        </div>
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
          Controle final avant enregistrement. Verifie attentivement ces
          donnees, elles serviront de base pour le compte.
        </p>
      </div>

      <div className="grid gap-x-16 gap-y-12 md:grid-cols-2">
        <section className="space-y-4">
          <div className="flex items-center gap-2 border-b border-border-subtle pb-2 text-sm font-medium text-foreground">
            <MapPin className="size-4 text-muted-foreground" />
            <h3>Coordonnees</h3>
          </div>
          <div>
            <ReviewRow
              label="Adresse"
              value={values.address || "Non renseignee"}
            />
            <ReviewRow
              label="Ville"
              value={
                [values.postal_code, values.city].filter(Boolean).join(" ") ||
                "Non renseignee"
              }
            />
            <ReviewRow
              label="Agence"
              value={getAgencyLabel(agencies, values.agency_id)}
            />
          </div>
        </section>

        {isIndividualClient ? (
          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b border-border-subtle pb-2 text-sm font-medium text-foreground">
              <UserRound className="size-4 text-muted-foreground" />
              <h3>Contact principal</h3>
            </div>
            <div>
              <ReviewRow
                label="Nom complet"
                value={
                  [values.first_name, values.last_name]
                    .filter(Boolean)
                    .join(" ") || "Non renseigne"
                }
              />
              <ReviewRow
                label="Telephone"
                value={values.phone || "Non renseigne"}
              />
              <ReviewRow
                label="Email"
                value={values.email || "Non renseigne"}
              />
            </div>
          </section>
        ) : (
          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b border-border-subtle pb-2 text-sm font-medium text-foreground">
              <ShieldCheck className="size-4 text-muted-foreground" />
              <h3>Donnees officielles</h3>
            </div>
            <div>
              <ReviewRow
                label="Nom officiel"
                value={values.official_name || "Non renseigne"}
              />
              <ReviewRow
                label="SIRET"
                value={values.siret || "Non renseigne"}
              />
              <ReviewRow
                label="SIREN"
                value={values.siren || "Non renseigne"}
              />
              <ReviewRow
                label="Code NAF"
                value={values.naf_code || "Non renseigne"}
              />
              {selectedCompany ? (
                <ReviewRow
                  label="Statut etablissement"
                  value={
                    selectedCompany.establishment_status === "closed" && closedAt
                      ? `${getCompanySearchStatusLabel(selectedCompany.establishment_status)} le ${closedAt}`
                      : getCompanySearchStatusLabel(
                          selectedCompany.establishment_status,
                        )
                  }
                />
              ) : null}
            </div>
          </section>
        )}

        {effectiveIntent === "client" && (
          <section className="space-y-4 md:col-span-2">
            <div className="flex items-center gap-2 border-b border-border-subtle pb-2 text-sm font-medium text-foreground">
              <Building2 className="size-4 text-muted-foreground" />
              <h3>Compte client</h3>
            </div>
            <div className="grid gap-x-16 md:grid-cols-2">
              <div>
                <ReviewRow
                  label="Numero client"
                  value={values.client_number || "A renseigner"}
                />
                <ReviewRow
                  label="Type"
                  value={
                    isIndividualClient
                      ? "Comptant"
                      : values.account_type === "cash"
                        ? "Comptant"
                        : "Compte a terme"
                  }
                />
              </div>
              <div>
                <ReviewRow
                  label="Commercial CIR"
                  value={
                    isIndividualClient
                      ? "Aucun"
                      : values.cir_commercial_id
                        ? "Affecte"
                        : "Non affecte"
                  }
                />
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default EntityOnboardingReviewStep;
