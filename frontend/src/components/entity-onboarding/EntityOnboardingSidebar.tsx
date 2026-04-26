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
} from 'shared/schemas/directory.schema';
import { Badge } from '@/components/ui/badge';

import { EntityOnboardingCompanySummary } from './EntityOnboardingCompanySummary';
import { SidebarInfoRow, SidebarSection } from './EntityOnboardingSidebarSection';
import type { CompanySearchGroup, DuplicateMatch } from './entityOnboarding.types';
import { formatOfficialDate, getCompanySearchStatusLabel } from './entityOnboarding.utils';

interface EntityOnboardingSidebarProps {
  company: DirectoryCompanySearchResult | undefined;
  selectedGroup: CompanySearchGroup | null;
  companyDetails: DirectoryCompanyDetails | undefined;
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
  societe_mission: 'Societe a mission'
};

const formatMoney = (value: number | null | undefined): string | null =>
  typeof value === 'number' ? CURRENCY_FORMATTER.format(value) : null;

const EntityOnboardingSidebar = ({
  company,
  selectedGroup,
  companyDetails,
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

  return (
    <aside className="flex w-full shrink-0 flex-col border-t border-border-subtle bg-surface-1/40 max-h-[35vh] xl:max-h-none xl:w-[380px] xl:border-l xl:border-t-0">
      <div className="flex h-full flex-col">
        <div className="border-b border-border-subtle bg-surface-1/20 p-5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <ShieldCheck className="size-3.5" />
            Intelligence Commerciale
          </div>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <EntityOnboardingCompanySummary
            company={company}
            selectedGroup={selectedGroup}
            companyDetails={companyDetails}
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
                    <div className="flex flex-wrap items-center gap-2">
                      {establishmentStatus ? (
                        <Badge
                          variant={company.establishment_status === 'closed' ? 'destructive' : company.establishment_status === 'open' ? 'success' : 'outline'}
                          density="dense"
                        >
                          {establishmentStatus}
                        </Badge>
                      ) : null}
                      {company.is_head_office ? (
                        <Badge variant="outline" density="dense">Siège social</Badge>
                      ) : null}
                      {company.is_former_head_office ? (
                        <Badge variant="outline" density="dense">Ancien siège</Badge>
                      ) : null}
                    </div>

                    <div className="space-y-2.5">
                      {company.siret ? <SidebarInfoRow label="SIRET" value={company.siret} /> : null}
                      {company.city ? <SidebarInfoRow label="Ville" value={company.city} /> : null}
                      {company.region ? <SidebarInfoRow label="Region" value={company.region} /> : null}
                      {company.date_debut_activite ? (
                        <SidebarInfoRow
                          label="Debut d activite"
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
                <div className="rounded-lg border border-dashed border-border-subtle bg-background px-4 py-3 text-[12px] text-muted-foreground">
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
                  <div className="flex flex-wrap gap-2">
                    {activeSignals.map((signal) => (
                      <Badge key={signal} variant="outline" className="gap-1 border-primary/15 bg-primary/[0.04] text-primary">
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
                  <div className="space-y-3">
                    {companyDetails.directors.slice(0, 3).map((director) => (
                      <div key={`${director.full_name}-${director.role ?? 'role'}`} className="rounded-md border border-border-subtle/60 bg-surface-1/30 p-3">
                        <div className="flex items-center gap-2">
                          <Users className="size-3.5 text-muted-foreground" />
                          <p className="text-[12px] font-semibold text-foreground">{director.full_name}</p>
                        </div>
                        <div className="mt-2 space-y-1.5 text-[11px] text-muted-foreground">
                          {director.role ? <p>{director.role}</p> : null}
                          {director.nationality ? <p>{director.nationality}</p> : null}
                          {director.birth_year !== null ? <p>Né en {director.birth_year}</p> : null}
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
                  <div className="grid grid-cols-1 gap-3">
                    <div className="rounded-md border border-border-subtle/60 bg-surface-1/30 p-3">
                      <div className="flex items-center gap-2">
                        <Landmark className="size-3.5 text-muted-foreground" />
                        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">CA</p>
                      </div>
                      <p className="mt-2 text-[14px] font-semibold text-foreground">
                        {formatMoney(companyDetails.financials.revenue) ?? 'Non renseigné'}
                      </p>
                    </div>
                    <div className="rounded-md border border-border-subtle/60 bg-surface-1/30 p-3">
                      <div className="flex items-center gap-2">
                        <Factory className="size-3.5 text-muted-foreground" />
                        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Résultat net</p>
                      </div>
                      <p className="mt-2 text-[14px] font-semibold text-foreground">
                        {formatMoney(companyDetails.financials.net_income) ?? 'Non renseigné'}
                      </p>
                    </div>
                  </div>
                </SidebarSection>
              ) : null}
            </>
          ) : null}

          {stepError ? (
            <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
              {stepError}
            </div>
          ) : null}

          {!isReviewStep && duplicateMatches.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-warning">
                <AlertCircle className="size-3.5" />
                Doublons détectés ({duplicateMatches.length})
              </div>
              <div className="space-y-2">
                {duplicateMatches.map(({ record, reason }) => (
                  <button
                    key={record.id}
                    type="button"
                    className="w-full rounded-md border border-warning/30 bg-warning/[0.03] p-3 text-left shadow-sm transition-colors hover:bg-warning/[0.06]"
                    onClick={() => onOpenDuplicate?.(record)}
                  >
                    <p className="text-[13px] font-bold text-foreground">{record.name}</p>
                    <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{reason}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {isDetailsStep ? (
            missingChecklist.length > 0 ? (
              <div className="space-y-3 pt-1">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  <div className="h-px flex-1 bg-border-subtle" />
                  <span>Checklist</span>
                  <div className="h-px flex-1 bg-border-subtle" />
                </div>
                <ul className="grid grid-cols-1 gap-2">
                  {missingChecklist.map((field) => (
                    <li
                      key={field}
                      className="flex items-center gap-2 rounded border border-border-subtle/50 bg-surface-1/50 px-2.5 py-1.5 text-[12px] font-medium text-muted-foreground/80"
                    >
                      <div className="size-1.5 rounded-full bg-destructive/40" />
                      {field}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-md border border-success/30 bg-success/5 p-3 text-[12px] font-medium text-success">
                <CircleCheck className="size-4" />
                Tous les champs requis sont saisis
              </div>
            )
          ) : null}

          <div className="space-y-2">
            <div className="text-center text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
              Notes de parcours
            </div>
            <div className="rounded-lg border border-border-subtle bg-surface-1/20 p-4 text-[13px] italic leading-relaxed text-muted-foreground/80">
              &quot;{footerMessage}&quot;
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default EntityOnboardingSidebar;
