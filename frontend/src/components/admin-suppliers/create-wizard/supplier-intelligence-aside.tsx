import { FileText, Globe2, Hash, Mail, MapPin, Phone } from 'lucide-react';

import type { DirectoryCompanySearchResult } from '../../../../../shared/schemas/system/directory.schema';
import { formatOfficialNaf, formatOfficialRegion } from '../../../../../shared/reference/officialLabels';
import { Badge } from '../../ui/data-display/Badge';
import { Button } from '../../ui/inputs/basic/Button';
import { EntityRecordWizardAside } from '@/components/entity-record-wizard/EntityRecordWizardRows';
import type { CompanySearchGroup } from '../../entity-onboarding/entityOnboarding.types';
import { formatOfficialDate, getCompanySearchStatusLabel } from '../../entity-onboarding/entityOnboarding.utils';
import { cn } from '@/lib/utils';
import getEstablishmentLabel from './get-establishment-label';
import getStatusBadgeVariant from './get-status-badge-variant';
import type { Step, SupplierDraft } from './use-supplier-onboarding';

interface SupplierIntelligenceAsideProps {
  step: Step;
  draft: SupplierDraft;
  selectedGroup: CompanySearchGroup | null;
  selectedCompany: DirectoryCompanySearchResult | null;
  importSelectedCompany: () => void;
}

/**
 * Sidebar component of the supplier creation wizard. Displays official company details
 * during the search step, and a real-time preview of the draft during typing/review.
 * @param {SupplierIntelligenceAsideProps} props - The component props.
 * @returns {JSX.Element} The rendered sidebar.
 */
const SupplierIntelligenceAside = ({
  step,
  draft,
  selectedGroup,
  selectedCompany,
  importSelectedCompany
}: SupplierIntelligenceAsideProps) => {
  return (
    <EntityRecordWizardAside label="Prévisualisation fournisseur" className="max-h-[38vh] lg:max-h-none">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
        <Globe2 className="size-4 text-primary" aria-hidden="true" />
        Intelligence fournisseur
      </div>

      {/* Real-time preview card when in edit or review mode */}
      {step !== 'search' ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <span className="text-[9px] font-bold uppercase tracking-wider text-primary">Aperçu fiche</span>
                <p className="truncate text-base font-bold text-foreground leading-tight">
                  {draft.name.trim() || 'Nouveau Fournisseur'}
                </p>
              </div>
              {draft.official_data_source ? (
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-success shadow-[0_0_0_2px_hsl(var(--success)/0.14)]" aria-hidden="true" />
                  <Badge variant="success" className="text-[9px] px-1.5 py-0 border-success/30 bg-success/5 text-success">OFFICIEL</Badge>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-warning shadow-[0_0_0_2px_hsl(var(--warning)/0.14)]" aria-hidden="true" />
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-primary/30 bg-primary/5 text-primary">MANUEL</Badge>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div className="rounded-lg border border-border-subtle bg-surface-2/40 p-2.5 space-y-0.5">
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Code</p>
                <p className="font-mono text-xs font-bold text-foreground truncate">{draft.supplier_code || '—'}</p>
              </div>
              <div className="rounded-lg border border-border-subtle bg-surface-2/40 p-2.5 space-y-0.5">
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">N° Interne</p>
                <p className="text-xs font-bold text-foreground truncate">{draft.supplier_number || '—'}</p>
              </div>
            </div>

            <div className="space-y-2.5 pt-1 text-xs">
              <div className="flex items-center gap-2.5 font-medium text-foreground">
                <Phone className="size-3.5 text-muted-foreground/75 shrink-0" />
                <span className={cn(!draft.primary_phone && 'text-muted-foreground/50 italic font-normal')}>
                  {draft.primary_phone || 'Aucun téléphone'}
                </span>
              </div>
              <div className="flex items-center gap-2.5 font-medium text-foreground">
                <Mail className="size-3.5 text-muted-foreground/75 shrink-0" />
                <span className={cn(!draft.primary_email && 'text-muted-foreground/50 italic font-normal')}>
                  {draft.primary_email || 'Aucun email'}
                </span>
              </div>
              <div className="flex items-start gap-2.5 font-medium text-foreground">
                <MapPin className="size-3.5 text-muted-foreground/75 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  {draft.address ? (
                    <>
                      <p className="truncate">{draft.address}</p>
                      {draft.postal_code || draft.city ? (
                        <p className="text-[11px] text-muted-foreground mt-0.5 font-semibold">
                          {[draft.postal_code, draft.city].filter(Boolean).join(' ')}
                        </p>
                      ) : null}
                    </>
                  ) : (
                    <span className="text-muted-foreground/50 italic font-normal">Adresse non renseignée</span>
                  )}
                </div>
              </div>
            </div>

            {draft.siret || draft.naf_code || draft.city ? (
              <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border-subtle">
                {draft.siret ? <Badge variant="outline" className="text-[9px] font-mono bg-background/50">SIRET {draft.siret}</Badge> : null}
                {draft.naf_code ? <Badge variant="outline" className="text-[9px] font-mono bg-background/50">NAF {draft.naf_code}</Badge> : null}
              </div>
            ) : null}
          </div>

          {step === 'details' && (
            <div className="rounded-lg border border-primary/10 bg-primary/[0.01] p-4 text-xs text-muted-foreground leading-relaxed space-y-2">
              <div className="flex items-center gap-1.5 font-semibold text-primary">
                <FileText className="size-3.5" /> Fiche en cours de saisie
              </div>
              <p>Complète les champs obligatoires marqués d&apos;un astérisque rouge pour débloquer l&apos;étape de validation finale.</p>
            </div>
          )}
        </div>
      ) : selectedGroup || selectedCompany ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-foreground">
                  {selectedGroup?.label ?? selectedCompany?.official_name ?? selectedCompany?.name}
                </p>
                {selectedGroup?.subtitle ? <p className="mt-0.5 text-xs text-muted-foreground font-medium">{selectedGroup.subtitle}</p> : null}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-success shadow-[0_0_0_2px_hsl(var(--success)/0.14)]" aria-hidden="true" />
                <Badge variant="success" className="text-[9px] px-1.5 py-0">Officiel</Badge>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border-subtle bg-surface-2/40 p-2.5">
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">SIREN</p>
                <p className="mt-0.5 font-mono text-xs font-semibold text-foreground">{selectedGroup?.siren ?? selectedCompany?.siren ?? '-'}</p>
              </div>
              <div className="rounded-lg border border-border-subtle bg-surface-2/40 p-2.5">
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Structure</p>
                <p className="mt-0.5 text-xs font-semibold text-foreground">
                  {selectedGroup ? `${selectedGroup.totalEstablishmentCount} site${selectedGroup.totalEstablishmentCount > 1 ? 's' : ''}` : '-'}
                </p>
              </div>
            </div>
            {selectedGroup ? (
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="text-[10px] border-success/30 bg-success/5 text-success">{selectedGroup.openEstablishmentCount} actifs</Badge>
                {selectedGroup.closedEstablishmentCount > 0 ? <Badge variant="outline" className="text-[10px] border-destructive/30 bg-destructive/5 text-destructive">{selectedGroup.closedEstablishmentCount} fermés</Badge> : null}
                {selectedGroup.unknownEstablishmentCount > 0 ? <Badge variant="outline" className="text-[10px]">{selectedGroup.unknownEstablishmentCount} inconnus</Badge> : null}
              </div>
            ) : null}
          </div>

          {selectedCompany ? (
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
              <div className="flex items-start justify-between gap-3 border-b border-border-subtle pb-3">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Établissement sélectionné</p>
                  <p className="mt-0.5 text-sm font-bold text-foreground">{getEstablishmentLabel(selectedCompany)}</p>
                </div>
                <Badge variant={getStatusBadgeVariant(selectedCompany.establishment_status)} className="text-[10px] px-1.5 py-0.5">
                  {getCompanySearchStatusLabel(selectedCompany.establishment_status)}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {selectedCompany.is_head_office ? <Badge variant="outline" className="text-[10px] border-primary/20 bg-primary/5 text-primary">Siège social</Badge> : null}
                {selectedCompany.is_former_head_office ? <Badge variant="outline" className="text-[10px]">Ancien siège</Badge> : null}
                {selectedCompany.naf_code ? <Badge variant="outline" className="text-[10px]"><Hash className="size-3" />{selectedCompany.naf_code}</Badge> : null}
              </div>
              <dl className="space-y-3 text-xs font-medium text-foreground pt-1">
                {selectedCompany.siret ? (
                  <div className="flex flex-col gap-0.5">
                    <dt className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">SIRET</dt>
                    <dd className="font-mono font-semibold">{selectedCompany.siret}</dd>
                  </div>
                ) : null}
                {selectedCompany.address ? (
                  <div className="flex flex-col gap-0.5">
                    <dt className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Adresse</dt>
                    <dd className="font-semibold">{selectedCompany.address}</dd>
                  </div>
                ) : null}
                {selectedCompany.city ? (
                  <div className="flex flex-col gap-0.5">
                    <dt className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Ville</dt>
                    <dd className="font-semibold">{[selectedCompany.postal_code, selectedCompany.city].filter(Boolean).join(' ')}</dd>
                  </div>
                ) : null}
                {selectedCompany.region ? (
                  <div className="flex flex-col gap-0.5">
                    <dt className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Région</dt>
                    <dd className="font-semibold">{formatOfficialRegion(selectedCompany.region) ?? selectedCompany.region}</dd>
                  </div>
                ) : null}
                {formatOfficialNaf(selectedCompany.naf_code) ? (
                  <div className="flex flex-col gap-0.5">
                    <dt className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Activité</dt>
                    <dd className="font-semibold">{formatOfficialNaf(selectedCompany.naf_code)}</dd>
                  </div>
                ) : null}
                {selectedCompany.date_debut_activite ? (
                  <div className="flex flex-col gap-0.5">
                    <dt className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Début d&apos;activité</dt>
                    <dd className="font-semibold">{formatOfficialDate(selectedCompany.date_debut_activite) ?? selectedCompany.date_debut_activite}</dd>
                  </div>
                ) : null}
                {selectedCompany.establishment_closed_at ? (
                  <div className="flex flex-col gap-0.5">
                    <dt className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Fermeture</dt>
                    <dd className="font-semibold text-destructive">{formatOfficialDate(selectedCompany.establishment_closed_at) ?? selectedCompany.establishment_closed_at}</dd>
                  </div>
                ) : null}
              </dl>
              {step === 'search' ? (
                <Button type="button" className="w-full mt-2 transition-transform active:scale-[0.98]" onClick={importSelectedCompany}>
                  Utiliser cet établissement
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-xs font-semibold text-muted-foreground leading-normal">
              Sélectionne un établissement de la liste pour en prévisualiser les données complètes.
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-xs font-semibold text-muted-foreground leading-normal">
          Recherche une entreprise pour pouvoir en visualiser les sites et importer ses informations.
        </div>
      )}

      {draft.siret || draft.naf_code || draft.city ? (
        <div className="mt-6 flex flex-wrap gap-2 pt-4 border-t border-border-subtle">
          {draft.siret ? <Badge variant="outline" className="text-[10px]">Importé SIRET {draft.siret}</Badge> : null}
          {draft.naf_code ? <Badge variant="outline" className="text-[10px]"><Hash className="size-2.5" />{draft.naf_code}</Badge> : null}
          {draft.city ? <Badge variant="outline" className="text-[10px]">{draft.city}</Badge> : null}
        </div>
      ) : null}
    </EntityRecordWizardAside>
  );
};

export default SupplierIntelligenceAside;
