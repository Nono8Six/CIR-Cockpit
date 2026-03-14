import { type ReactNode, useMemo, useState } from 'react';
import {
  AlertCircle,
  Building2,
  ChevronDown,
  CircleCheck,
  Copy,
  Factory,
  Landmark,
  LoaderCircle,
  ShieldCheck,
  Sparkles,
  Users
} from 'lucide-react';

import type {
  DirectoryCompanyDetails,
  DirectoryCompanySearchResult,
  DirectoryListRow
} from 'shared/schemas/directory.schema';
import { cn } from '@/lib/utils';
import { notifySuccess } from '@/services/errors/notify';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { formatOfficialDate, getCompanySearchStatusLabel } from './entityOnboarding.utils';
import type { CompanySearchGroup, DuplicateMatch } from './entityOnboarding.types';

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

interface SidebarSectionProps {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

const NUMBER_FORMATTER = new Intl.NumberFormat('fr-FR');
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

const SidebarSection = ({
  title,
  subtitle,
  defaultOpen = false,
  children
}: SidebarSectionProps) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="rounded-lg border border-border-subtle bg-background shadow-sm">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
      >
        <div>
          <p className="text-[12px] font-semibold text-foreground">{title}</p>
          {subtitle ? (
            <p className="mt-0.5 text-[11px] text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        <ChevronDown
          className={cn(
            'size-4 text-muted-foreground transition-transform duration-200',
            open ? 'rotate-180' : undefined
          )}
        />
      </button>
      {open ? (
        <div className="border-t border-border-subtle px-4 py-4">{children}</div>
      ) : null}
    </section>
  );
};

const SidebarInfoRow = ({
  label,
  value
}: {
  label: string;
  value: string;
}) => (
  <div className="flex items-start justify-between gap-4 text-[12px]">
    <span className="text-muted-foreground">{label}</span>
    <span className="text-right font-medium text-foreground">{value}</span>
  </div>
);

const formatStructureCount = (count: number | null | undefined): string | null =>
  typeof count === 'number' ? `${NUMBER_FORMATTER.format(count)} site${count > 1 ? 's' : ''}` : null;

const formatMoney = (value: number | null | undefined): string | null =>
  typeof value === 'number' ? CURRENCY_FORMATTER.format(value) : null;

const buildCommercialClipboard = (
  company: DirectoryCompanySearchResult | undefined,
  companyDetails: DirectoryCompanyDetails | undefined
): string | null => {
  const lines = [
    companyDetails?.official_name ?? company?.official_name ?? company?.name ?? null,
    companyDetails?.sigle ? `Sigle: ${companyDetails.sigle}` : null,
    companyDetails?.nature_juridique ? `Nature juridique: ${companyDetails.nature_juridique}` : null,
    companyDetails?.siren ?? company?.siren ? `SIREN: ${companyDetails?.siren ?? company?.siren}` : null,
    company?.siret ? `SIRET: ${company.siret}` : null,
    company?.address ? `Adresse: ${company.address}` : null,
    company?.city ? `Ville: ${company.city}` : null
  ].filter((line): line is string => Boolean(line));

  return lines.length > 0 ? lines.join('\n') : null;
};

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

  const companyName =
    companyDetails?.official_name ??
    selectedGroup?.label ??
    company?.official_name ??
    company?.name ??
    null;
  const companySubtitle =
    companyDetails?.name && companyDetails.name !== companyDetails.official_name
      ? companyDetails.name
      : selectedGroup?.subtitle ?? null;
  const structureCount =
    companyDetails?.company_establishments_count ?? selectedGroup?.totalEstablishmentCount ?? company?.company_establishments_count ?? null;
  const openCount =
    companyDetails?.company_open_establishments_count ?? selectedGroup?.openEstablishmentCount ?? company?.company_open_establishments_count ?? null;
  const clipboardValue = buildCommercialClipboard(company, companyDetails);
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
          {companyName ? (
            <div className="space-y-4 rounded-lg border border-border-subtle bg-background p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-bold text-foreground">{companyName}</p>
                  {companySubtitle ? (
                    <p className="text-[12px] text-muted-foreground">{companySubtitle}</p>
                  ) : null}
                  {companyDetailsLoading ? (
                    <div className="flex items-center gap-2 pt-1 text-[11px] text-muted-foreground">
                      <LoaderCircle className="size-3 animate-spin" />
                      Chargement des donnees officielles enrichies
                    </div>
                  ) : null}
                </div>
                {companyDetails ? (
                  <Badge variant="success" density="dense" className="gap-1 border-success/20 bg-success/5 text-success">
                    <Sparkles className="size-3" />
                    Officiel
                  </Badge>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md border border-border-subtle/60 bg-surface-1/40 p-3">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    SIREN
                  </p>
                  <p className="mt-1 font-mono text-[12px] font-medium text-foreground">
                    {companyDetails?.siren ?? company?.siren ?? '-'}
                  </p>
                </div>
                <div className="rounded-md border border-border-subtle/60 bg-surface-1/40 p-3">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Code NAF
                  </p>
                  <p className="mt-1 font-mono text-[12px] font-medium text-foreground">
                    {companyDetails?.activite_principale_naf25 ?? company?.naf_code ?? '-'}
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                {companyDetails?.nature_juridique ? (
                  <SidebarInfoRow label="Nature juridique" value={companyDetails.nature_juridique} />
                ) : null}
                {companyDetails?.categorie_entreprise ? (
                  <SidebarInfoRow label="Categorie" value={companyDetails.categorie_entreprise} />
                ) : null}
                {companyDetails?.employee_range ? (
                  <SidebarInfoRow label="Effectif" value={companyDetails.employee_range} />
                ) : null}
                {companyDetails?.date_creation ? (
                  <SidebarInfoRow
                    label="Creation"
                    value={formatOfficialDate(companyDetails.date_creation) ?? companyDetails.date_creation}
                  />
                ) : null}
                {structureCount !== null ? (
                  <SidebarInfoRow
                    label="Structure"
                    value={[
                      formatStructureCount(structureCount),
                      typeof openCount === 'number' ? `${NUMBER_FORMATTER.format(openCount)} actifs` : null
                    ]
                      .filter((value): value is string => Boolean(value))
                      .join(' · ')}
                  />
                ) : null}
              </div>

              {clipboardValue ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="dense"
                  className="w-full justify-between border border-dashed border-border-subtle text-[11px] text-muted-foreground"
                  onClick={() => {
                    void navigator.clipboard.writeText(clipboardValue);
                    notifySuccess('Données copiées');
                  }}
                >
                  <span>Presse-papier commercial</span>
                  <Copy className="size-3" />
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="flex h-32 flex-col items-center justify-center rounded-lg border border-dashed border-border-subtle bg-surface-1/20 px-6 text-center">
              <Building2 className="mb-2 size-6 text-muted-foreground/40" />
              <p className="text-[12px] leading-snug text-muted-foreground">
                Sélectionnez une entreprise pour voir son intelligence commerciale
              </p>
            </div>
          )}

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
