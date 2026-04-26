import { Building2, Copy, LoaderCircle, Sparkles } from 'lucide-react';

import type { DirectoryCompanyDetails, DirectoryCompanySearchResult } from 'shared/schemas/directory.schema';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { notifySuccess } from '@/services/errors/notify';

import type { CompanySearchGroup } from './entityOnboarding.types';
import { formatOfficialDate } from './entityOnboarding.utils';
import { SidebarInfoRow } from './EntityOnboardingSidebarSection';

interface EntityOnboardingCompanySummaryProps {
  company: DirectoryCompanySearchResult | undefined;
  selectedGroup: CompanySearchGroup | null;
  companyDetails: DirectoryCompanyDetails | undefined;
  companyDetailsLoading: boolean;
}

const NUMBER_FORMATTER = new Intl.NumberFormat('fr-FR');

const formatStructureCount = (count: number | null | undefined): string | null =>
  typeof count === 'number' ? `${NUMBER_FORMATTER.format(count)} site${count > 1 ? 's' : ''}` : null;

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

export const EntityOnboardingCompanySummary = ({
  company,
  selectedGroup,
  companyDetails,
  companyDetailsLoading
}: EntityOnboardingCompanySummaryProps) => {
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
    companyDetails?.company_establishments_count ??
    selectedGroup?.totalEstablishmentCount ??
    company?.company_establishments_count ??
    null;
  const openCount =
    companyDetails?.company_open_establishments_count ?? selectedGroup?.openEstablishmentCount ?? company?.company_open_establishments_count ?? null;
  const clipboardValue = buildCommercialClipboard(company, companyDetails);

  if (!companyName) {
    return (
      <div className="flex h-32 flex-col items-center justify-center rounded-lg border border-dashed border-border-subtle bg-surface-1/20 px-6 text-center">
        <Building2 className="mb-2 size-6 text-muted-foreground/40" />
        <p className="text-[12px] leading-snug text-muted-foreground">
          Sélectionnez une entreprise pour voir son intelligence commerciale
        </p>
      </div>
    );
  }

  return (
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
  );
};
