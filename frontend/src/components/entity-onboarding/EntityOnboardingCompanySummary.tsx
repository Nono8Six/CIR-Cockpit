import { Building2, Copy, LoaderCircle, Sparkles } from 'lucide-react';

import type { DirectoryCompanyDetails, DirectoryCompanySearchResult } from '../../../../shared/schemas/system/directory.schema';
import { formatOfficialNaf } from '../../../../shared/reference/officialLabels';
import { Badge } from '../ui/data-display/Badge';
import { Button } from '../ui/inputs/basic/Button';
import { notifySuccess } from '@/services/errors/notifySuccess';

import type { CompanySearchGroup } from './entityOnboarding.types';
import { formatOfficialDate } from './entityOnboarding.utils';
import { SidebarInfoRow } from './EntityOnboardingSidebarSection';

interface EntityOnboardingCompanySummaryProps {
  company: DirectoryCompanySearchResult | undefined;
  selectedGroup: CompanySearchGroup | null;
  companyDetails: DirectoryCompanyDetails | undefined;
  companyDetailsUnavailable: boolean;
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
  companyDetailsUnavailable,
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
  const activityLabel = formatOfficialNaf(companyDetails?.activite_principale_naf25 ?? company?.naf_code);

  if (!companyName) {
    return (
      <div className="flex h-32 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface-1/40 px-6 text-center">
        <Building2 className="mb-2 size-6 text-muted-foreground/30" />
        <p className="text-[12px] leading-snug text-muted-foreground/85">
          Sélectionnez une entreprise pour voir son intelligence commerciale
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4 border-b border-border">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-bold text-foreground leading-snug">{companyName}</p>
          {companySubtitle ? (
            <p className="text-[11px] text-muted-foreground">{companySubtitle}</p>
          ) : null}
          {companyDetailsLoading ? (
            <div className="flex items-center gap-2 pt-1 text-[11px] text-muted-foreground">
              <LoaderCircle className="size-3 animate-spin text-primary" />
              Chargement des données officielles...
            </div>
          ) : null}
          {companyDetailsUnavailable ? (
            <p className="pt-1 text-[11px] leading-relaxed text-warning font-medium">
              Données enrichies indisponibles.
            </p>
          ) : null}
        </div>
        {companyDetails ? (
          <Badge variant="outline" density="dense" className="gap-1 border-success/20 bg-success/5 text-success font-medium">
            <Sparkles className="size-3" />
            Officiel
          </Badge>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-border bg-surface-2/40 p-3">
          <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/80">
            SIREN
          </p>
          <p className="mt-1 font-mono text-[12px] font-bold text-foreground">
            {companyDetails?.siren ?? company?.siren ?? '-'}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-surface-2/40 p-3">
          <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/80">
            Code NAF
          </p>
          <p className="mt-1 text-[12px] font-bold leading-snug text-foreground break-words">
            {activityLabel ?? '-'}
          </p>
        </div>
      </div>

      <div className="space-y-2 pt-1">
        {companyDetails?.nature_juridique ? (
          <SidebarInfoRow label="Nature juridique" value={companyDetails.nature_juridique} />
        ) : null}
        {companyDetails?.categorie_entreprise ? (
          <SidebarInfoRow label="Catégorie" value={companyDetails.categorie_entreprise} />
        ) : null}
        {companyDetails?.employee_range ? (
          <SidebarInfoRow label="Effectif" value={companyDetails.employee_range} />
        ) : null}
        {companyDetails?.date_creation ? (
          <SidebarInfoRow
            label="Création"
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
          className="w-full justify-between border border-border hover:bg-surface-2 bg-surface-1/50 text-[11px] text-muted-foreground hover:text-foreground font-medium rounded-lg py-2"
          onClick={() => {
            void navigator.clipboard.writeText(clipboardValue);
            notifySuccess('Données copiées');
          }}
        >
          <span>Presse-papier commercial</span>
          <Copy className="size-3.5" />
        </Button>
      ) : null}
    </div>
  );
};
