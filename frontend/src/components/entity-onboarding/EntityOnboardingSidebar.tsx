import { useMemo } from 'react';
import {
  AlertCircle,
  CircleCheck,
  Factory,
  Landmark,
  ShieldCheck,
  Sparkles,
  Users
} from 'lucide-react';

import type {
  DirectoryCompanyDetails,
  DirectoryCompanySearchResult,
  DirectoryListRow
} from '../../../../shared/schemas/system/directory.schema';
import { formatOfficialNaf, formatOfficialRegion } from '../../../../shared/reference/officialLabels';
import { Badge } from '../ui/data-display/Badge';

import { EntityOnboardingCompanySummary } from './EntityOnboardingCompanySummary';
import { SidebarInfoRow, SidebarSection } from './EntityOnboardingSidebarSection';
import type { CompanySearchGroup, DuplicateMatch } from './entityOnboarding.types';
import { formatOfficialDate, getCompanySearchStatusLabel } from './entityOnboarding.utils';

interface EntityOnboardingSidebarProps {
  company: DirectoryCompanySearchResult | undefined;
  selectedGroup: CompanySearchGroup | null;
  companyDetails: DirectoryCompanyDetails | undefined;
  companyDetailsUnavailable: boolean;
  companyDetailsLoading: boolean;
  duplicateMatches: DuplicateMatch[];
  stepError: string | null;
  missingChecklist: string[];
  footerMessage: string;
  isDetailsStep: boolean;
  isReviewStep: boolean;
  onOpenDuplicate?: (record: DirectoryListRow) => void;
}

const CURRENCY_FORMATTER = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0
});

const SIGNAL_LABELS: Record<keyof DirectoryCompanyDetails['signals'], string> = {
  association: 'Association',
  ess: 'ESS',
  qualiopi: 'Qualiopi',
  rge: 'RGE',
  bio: 'Bio',
  organisme_formation: 'Organisme de formation',
  service_public: 'Service public',
  societe_mission: 'Société à mission'
};

const formatMoney = (value: number | null | undefined): string | null =>
  typeof value === 'number' ? CURRENCY_FORMATTER.format(value) : null;

const EntityOnboardingSidebar = ({
  company,
  selectedGroup,
  companyDetails,
  companyDetailsUnavailable,
  companyDetailsLoading,
  duplicateMatches,
  stepError,
  missingChecklist,
  footerMessage,
  isDetailsStep,
  isReviewStep,
  onOpenDuplicate
}: EntityOnboardingSidebarProps) => {
  const activeSignals = useMemo(
    () =>
      Object.entries(companyDetails?.signals ?? {}).filter(([, value]) => value).map(
        ([key]) => SIGNAL_LABELS[key as keyof DirectoryCompanyDetails['signals']]
      ),
    [companyDetails?.signals]
  );

  const establishmentStatus = company ? getCompanySearchStatusLabel(company.establishment_status) : null;
  const establishmentRegion = formatOfficialRegion(company?.region);
  const establishmentNaf = formatOfficialNaf(company?.naf_code);

  return (
    <aside
      aria-label="Intelligence commerciale et doublons"
      className="flex max-h-[38vh] w-full shrink-0 flex-col border-t border-border bg-surface-1/25 lg:max-h-none lg:w-[320px] lg:border-l lg:border-t-0 xl:w-[380px]"
    >
      <div className="flex h-full flex-col">
        <div className="border-b border-border bg-surface-1/40 px-5 py-4">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-foreground/80">
            <ShieldCheck className="size-3.5 text-primary" aria-hidden="true" />
            Intelligence Commerciale
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <EntityOnboardingCompanySummary
            company={company}
            selectedGroup={selectedGroup}
            companyDetails={companyDetails}
            companyDetailsUnavailable={companyDetailsUnavailable}
            companyDetailsLoading={companyDetailsLoading}
          />

          {company || selectedGroup ? (
            <>
              {company ? (
                <SidebarSection
                  key={company.siret ?? 'selected-establishment'}
                  title="Établissement sélectionné"
                  subtitle={company.address ?? 'Adresse non disponible'}
                  defaultOpen
                >
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {establishmentStatus ? (
                        <Badge
                          variant="outline"
                          density="dense"
                          className={company.establishment_status === 'closed'
                            ? 'border-destructive/25 bg-destructive/5 text-destructive font-medium text-[10px] px-2 py-0.5'
                            : 'border-success/20 bg-success/5 text-success font-medium text-[10px] px-2 py-0.5'
                          }
                        >
                          {establishmentStatus}
                        </Badge>
                      ) : null}
                      {company.is_head_office ? (
                        <Badge variant="outline" density="dense" className="border-border bg-surface-2 text-foreground font-medium text-[10px] px-2 py-0.5">
                          Siège social
                        </Badge>
                      ) : null}
                      {company.is_former_head_office ? (
                        <Badge variant="outline" density="dense" className="border-border bg-surface-2 text-foreground font-medium text-[10px] px-2 py-0.5">
                          Ancien siège
                        </Badge>
                      ) : null}
                    </div>

                    <div className="space-y-1 pt-1">
                      {company.siret ? <SidebarInfoRow label="SIRET" value={company.siret} /> : null}
                      {company.city ? <SidebarInfoRow label="Ville" value={company.city} /> : null}
                      {establishmentRegion ? <SidebarInfoRow label="Région" value={establishmentRegion} /> : null}
                      {establishmentNaf ? <SidebarInfoRow label="Activité" value={establishmentNaf} /> : null}
                      {company.date_debut_activite ? (
                        <SidebarInfoRow
                          label="Début d'activité"
                          value={formatOfficialDate(company.date_debut_activite) ?? company.date_debut_activite}
                        />
                      ) : null}
                      {company.establishment_closed_at ? (
                        <SidebarInfoRow
                          label="Fermeture"
                          value={formatOfficialDate(company.establishment_closed_at) ?? company.establishment_closed_at}
                        />
                      ) : null}
                      {company.commercial_name ? (
                        <SidebarInfoRow label="Nom commercial" value={company.commercial_name} />
                      ) : null}
                      {(company.brands?.length ?? 0) > 0 ? (
                        <SidebarInfoRow label="Enseignes" value={(company.brands ?? []).join(', ')} />
                      ) : null}
                    </div>
                  </div>
                </SidebarSection>
              ) : (
                <div className="rounded-lg border border-dashed border-border bg-surface-1/40 px-4 py-3 text-[11px] text-muted-foreground text-center">
                  Sélectionne un établissement pour voir les infos du site.
                </div>
              )}

              {activeSignals.length > 0 ? (
                <SidebarSection
                  key={activeSignals.join('|')}
                  title="Signaux & qualifications"
                  subtitle="Badges utiles au contexte commercial"
                  defaultOpen
                >
                  <div className="flex flex-wrap gap-1.5">
                    {activeSignals.map((signal) => (
                      <Badge key={signal} variant="outline" className="gap-1 border-primary/15 bg-primary/[0.04] text-primary text-[10px] font-medium px-2 py-0.5">
                        <Sparkles className="size-3" />
                        {signal}
                      </Badge>
                    ))}
                  </div>
                </SidebarSection>
              ) : null}

              {companyDetails?.directors.length ? (
                <SidebarSection
                  title="Dirigeants"
                  subtitle="Maximum trois profils utiles au contexte"
                >
                  <div className="space-y-2.5">
                    {companyDetails.directors.slice(0, 3).map((director) => (
                      <div key={`${director.full_name}-${director.role ?? 'role'}`} className="rounded-lg border border-border bg-background p-3">
                        <div className="flex items-center gap-2">
                          <Users className="size-3.5 text-muted-foreground/60" />
                          <p className="text-[12px] font-bold text-foreground leading-tight">{director.full_name}</p>
                        </div>
                        <div className="mt-2 space-y-1 text-[11px] text-muted-foreground">
                          {director.role ? <p className="font-medium text-foreground/80">{director.role}</p> : null}
                          {director.nationality ? <p>Nationalité : {director.nationality}</p> : null}
                          {director.birth_year !== null ? <p>Né(e) en {director.birth_year}</p> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </SidebarSection>
              ) : null}

              {companyDetails?.financials ? (
                <SidebarSection
                  title="Finances"
                  subtitle={`Dernière année disponible: ${companyDetails.financials.latest_year}`}
                >
                  <div className="grid grid-cols-1 gap-2.5">
                    <div className="rounded-lg border border-border bg-background p-3">
                      <div className="flex items-center gap-2">
                        <Landmark className="size-3.5 text-muted-foreground/50" />
                        <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/80">Chiffre d&apos;Affaires</p>
                      </div>
                      <p className="mt-1.5 text-[13px] font-bold text-foreground">
                        {formatMoney(companyDetails.financials.revenue) ?? 'Non renseigné'}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border bg-background p-3">
                      <div className="flex items-center gap-2">
                        <Factory className="size-3.5 text-muted-foreground/50" />
                        <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/80">Résultat net</p>
                      </div>
                      <p className="mt-1.5 text-[13px] font-bold text-foreground">
                        {formatMoney(companyDetails.financials.net_income) ?? 'Non renseigné'}
                      </p>
                    </div>
                  </div>
                </SidebarSection>
              ) : null}
            </>
          ) : null}

          {stepError ? (
            <div
              role="alert"
              aria-live="polite"
              className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-[12px] font-medium text-destructive leading-normal"
            >
              {stepError}
            </div>
          ) : null}

          {!isReviewStep && duplicateMatches.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-warning">
                <AlertCircle className="size-3.5 text-warning" aria-hidden="true" />
                Doublons détectés ({duplicateMatches.length})
              </div>
              <ul className="space-y-2">
                {duplicateMatches.map(({ record, reason }) => (
                  <li key={record.id}>
                    <button
                      type="button"
                      aria-label={`Ouvrir la fiche ${record.name}`}
                      className="w-full rounded-lg border border-warning/20 bg-warning/[0.02] p-3 text-left shadow-sm transition-all hover:bg-warning/[0.05] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-warning focus-visible:ring-offset-1"
                      onClick={() => onOpenDuplicate?.(record)}
                    >
                      <p className="break-words text-[12px] font-bold text-foreground">{record.name}</p>
                      <p className="mt-1 break-words text-[11px] leading-relaxed text-muted-foreground">{reason}</p>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {isDetailsStep ? (
            missingChecklist.length > 0 ? (
              <div className="space-y-3 pt-1">
                <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">
                  <div className="h-px flex-1 bg-border" />
                  <span>Checklist</span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <ul className="grid grid-cols-1 gap-2">
                  {missingChecklist.map((field) => (
                    <li
                      key={field}
                      className="flex items-center gap-2 rounded border border-border bg-surface-1/40 px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground"
                    >
                      <div className="size-1.5 rounded-full bg-destructive/60" />
                      {field}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-lg border border-success/20 bg-success/5 p-3 text-[12px] font-medium text-success">
                <CircleCheck className="size-4" />
                Tous les champs requis sont saisis
              </div>
            )
          ) : null}

          <div className="space-y-2 pt-1">
            <div className="text-center text-[9px] font-bold uppercase tracking-wider text-muted-foreground/50">
              Notes de parcours
            </div>
            <div className="rounded-xl border border-border bg-surface-2/30 p-4 text-[12px] italic leading-relaxed text-muted-foreground/80">
              &quot;{footerMessage}&quot;
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default EntityOnboardingSidebar;
