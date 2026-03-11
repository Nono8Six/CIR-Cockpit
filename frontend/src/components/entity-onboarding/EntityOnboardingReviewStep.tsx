import { BadgeCheck, Building2, Mail, MapPin, Phone, ShieldCheck, UserRound } from 'lucide-react';

import type { Agency } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import type { DirectoryCompanySearchResult } from 'shared/schemas/directory.schema';
import type { OnboardingValues } from './entityOnboarding.schema';
import type { DuplicateMatch } from './entityOnboarding.types';
import { getAgencyLabel } from './entityOnboarding.utils';

interface EntityOnboardingReviewStepProps {
  values: OnboardingValues;
  agencies: Agency[];
  effectiveIntent: 'client' | 'prospect';
  isIndividualClient: boolean;
  selectedCompany: DirectoryCompanySearchResult | undefined;
  duplicateMatches: DuplicateMatch[];
}

const ReviewRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-start justify-between gap-3 border-t border-border/50 py-3 first:border-t-0 first:pt-0 last:pb-0">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className="text-right text-sm font-medium text-foreground">{value}</span>
  </div>
);

const EntityOnboardingReviewStep = ({
  values,
  agencies,
  effectiveIntent,
  isIndividualClient,
  selectedCompany,
  duplicateMatches
}: EntityOnboardingReviewStepProps) => {
  const displayName = isIndividualClient
    ? [values.last_name, values.first_name].map((entry) => entry.trim()).filter(Boolean).join(' ')
    : values.name;

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_340px]">
      <div className="space-y-4">
        <Card variant="section" className="border-border/60 bg-card shadow-sm">
          <div className="border-b border-border/60 px-5 py-5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold tracking-tight text-foreground">{displayName}</h2>
              <Badge variant="secondary">{effectiveIntent === 'client' ? 'Client' : 'Prospect'}</Badge>
              {isIndividualClient ? <Badge variant="outline">Particulier</Badge> : null}
              {values.official_data_source ? <Badge variant="outline">Source officielle</Badge> : null}
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Controle final avant enregistrement dans l annuaire.
            </p>
          </div>

          <div className="grid gap-4 p-5 md:grid-cols-2">
            <div className="rounded-lg border border-border/60 bg-background p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <MapPin className="size-4 text-muted-foreground" />
                Coordonnees
              </div>
              <div className="mt-4">
                <ReviewRow label="Adresse" value={values.address || 'Non renseignee'} />
                <ReviewRow label="Ville" value={[values.postal_code, values.city].filter(Boolean).join(' ') || 'Non renseignee'} />
                <ReviewRow label="Agence" value={getAgencyLabel(agencies, values.agency_id)} />
              </div>
            </div>

            {isIndividualClient ? (
              <div className="rounded-lg border border-border/60 bg-background p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <UserRound className="size-4 text-muted-foreground" />
                  Contact principal
                </div>
                <div className="mt-4">
                  <ReviewRow label="Nom" value={[values.first_name, values.last_name].filter(Boolean).join(' ') || 'Non renseigne'} />
                  <ReviewRow label="Telephone" value={values.phone || 'Non renseigne'} />
                  <ReviewRow label="Email" value={values.email || 'Non renseigne'} />
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-border/60 bg-background p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <ShieldCheck className="size-4 text-muted-foreground" />
                  Donnees officielles
                </div>
                <div className="mt-4">
                  <ReviewRow label="Nom officiel" value={values.official_name || 'Non renseigne'} />
                  <ReviewRow label="SIRET" value={values.siret || 'Non renseigne'} />
                  <ReviewRow label="SIREN" value={values.siren || 'Non renseigne'} />
                  <ReviewRow label="Code NAF" value={values.naf_code || 'Non renseigne'} />
                </div>
              </div>
            )}

            {effectiveIntent === 'client' ? (
              <div className="rounded-lg border border-border/60 bg-background p-4 md:col-span-2">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Building2 className="size-4 text-muted-foreground" />
                  Compte client
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <ReviewRow label="Numero client" value={values.client_number || 'A renseigner'} />
                  <ReviewRow label="Type" value={isIndividualClient ? 'Comptant' : values.account_type === 'cash' ? 'Comptant' : 'Compte a terme'} />
                  <ReviewRow label="Commercial CIR" value={isIndividualClient ? 'Aucun' : values.cir_commercial_id ? 'Affecte' : 'Non affecte'} />
                </div>
              </div>
            ) : null}
          </div>
        </Card>
      </div>

      <aside className="space-y-4 xl:sticky xl:top-0">
        <Card variant="section" className="border-border/60 bg-card shadow-sm">
          <div className="border-b border-border/60 px-5 py-5">
            <div className="flex items-start gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg border border-primary/20 bg-primary/8 text-primary">
                <BadgeCheck className="size-4" />
              </div>
              <div>
                <p className="text-base font-semibold text-foreground">Pret a enregistrer</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Resume operationnel juste avant la creation.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4 px-5 py-5 text-sm leading-6 text-muted-foreground">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-4">
              <p className="font-medium text-foreground">
                {isIndividualClient
                  ? 'Le client particulier sera cree avec son contact principal et un compte comptant.'
                  : values.official_data_source
                    ? 'La fiche garde une trace de la source officielle importee.'
                    : 'Cette fiche sera creee a partir d une saisie manuelle.'}
              </p>
            </div>

            {selectedCompany && !isIndividualClient ? (
              <div className="rounded-lg border border-border/60 bg-background p-4">
                <p className="text-sm font-medium text-foreground">Etablissement importe</p>
                <p className="mt-2">
                  {[selectedCompany.postal_code, selectedCompany.city].filter(Boolean).join(' ') || selectedCompany.name}
                </p>
                <p className="text-sm text-muted-foreground">{selectedCompany.address ?? 'Adresse non diffusee'}</p>
              </div>
            ) : null}

            {isIndividualClient ? (
              <div className="rounded-lg border border-border/60 bg-background p-4">
                <p className="text-sm font-medium text-foreground">Canaux retenus</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {values.phone ? <Badge variant="outline"><Phone size={12} /> {values.phone}</Badge> : null}
                  {values.email ? <Badge variant="outline"><Mail size={12} /> {values.email}</Badge> : null}
                </div>
              </div>
            ) : null}

            <div className="rounded-lg border border-border/60 bg-background p-4">
              <p className="text-sm font-medium text-foreground">Statut controle</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant={duplicateMatches.length > 0 ? 'warning' : 'success'}>
                  {duplicateMatches.length > 0 ? 'Doublons a verifier' : 'Doublons OK'}
                </Badge>
                <Badge variant="outline">
                  {effectiveIntent === 'client' ? (isIndividualClient ? 'Creation client particulier' : 'Creation client') : 'Creation prospect'}
                </Badge>
              </div>
            </div>
          </div>
        </Card>
      </aside>
    </div>
  );
};

export default EntityOnboardingReviewStep;
