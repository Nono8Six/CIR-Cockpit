import type { ReactNode } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import {
  AlertTriangle,
  Building2,
  CircleCheckBig,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  UserRound
} from 'lucide-react';

import type {
  DirectoryCommercialOption,
  DirectoryCompanySearchResult
} from 'shared/schemas/directory.schema';
import type { Agency, UserRole } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { OnboardingFormInput, OnboardingValues } from './entityOnboarding.schema';
import type { DuplicateMatch } from './entityOnboarding.types';
import { getAgencyLabel, getDepartmentFromPostalCode } from './entityOnboarding.utils';

interface FieldShellProps {
  label: string;
  helper?: string;
  error?: string;
  className?: string;
  children: ReactNode;
}

const FieldShell = ({ label, helper, error, className, children }: FieldShellProps) => (
  <div className={className}>
    <div className="grid gap-2">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {!error && helper ? <p className="text-xs text-muted-foreground">{helper}</p> : null}
    </div>
  </div>
);

interface EntityOnboardingDetailsStepProps {
  form: UseFormReturn<OnboardingFormInput, unknown, OnboardingValues>;
  values: OnboardingValues;
  effectiveIntent: 'client' | 'prospect';
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
  selectedCompany,
  duplicateMatches,
  remainingRequiredFields
}: EntityOnboardingDetailsStepProps) => {
  const { errors } = form.formState;

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_340px]">
      <div className="space-y-4">
        <Card variant="section" className="border-border/60 bg-card shadow-sm">
          <div className="border-b border-border/60 px-5 py-5">
            <div className="flex items-center gap-2">
              {isIndividualClient ? <UserRound className="size-4 text-muted-foreground" /> : <Building2 className="size-4 text-muted-foreground" />}
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                {isIndividualClient ? 'Identite et contact principal' : 'Identite'}
              </h2>
            </div>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {isIndividualClient
                ? 'Le client particulier est rattache a un contact principal structure.'
                : 'Base de la fiche visible dans l annuaire et sur les fiches detail.'}
            </p>
          </div>

          <div className="grid gap-4 p-5 md:grid-cols-2">
            {isIndividualClient ? (
              <>
                <FieldShell label="Nom" error={errors.last_name?.message}>
                  <Input aria-label="Nom" {...form.register('last_name')} className="h-10 rounded-lg" />
                </FieldShell>
                <FieldShell label="Prenom" error={errors.first_name?.message}>
                  <Input aria-label="Prenom" {...form.register('first_name')} className="h-10 rounded-lg" />
                </FieldShell>
                <FieldShell label="Telephone" error={errors.phone?.message}>
                  <Input aria-label="Telephone" type="tel" autoComplete="tel" {...form.register('phone')} className="h-10 rounded-lg" />
                </FieldShell>
                <FieldShell label="Email" error={errors.email?.message}>
                  <Input aria-label="Email" type="email" autoComplete="email" {...form.register('email')} className="h-10 rounded-lg" />
                </FieldShell>
                <FieldShell label="Nom annuaire" helper="Construit automatiquement a partir du nom et du prenom." className="md:col-span-2">
                  <Input
                    aria-label="Nom annuaire"
                    value={[values.last_name, values.first_name].map((entry) => entry.trim()).filter(Boolean).join(' ')}
                    readOnly
                    className="h-10 rounded-lg"
                  />
                </FieldShell>
              </>
            ) : (
              <FieldShell label="Nom de la societe" error={errors.name?.message} className="md:col-span-2">
                <Input aria-label="Nom de la societe" {...form.register('name')} className="h-10 rounded-lg" />
              </FieldShell>
            )}

            <FieldShell label="Adresse" helper={isIndividualClient ? 'Optionnelle pour un particulier.' : 'Adresse principale retenue pour la fiche.'} className="md:col-span-2">
              <Input aria-label="Adresse" autoComplete="street-address" {...form.register('address')} className="h-10 rounded-lg" />
            </FieldShell>

            <FieldShell
              label="Code postal"
              helper="Le departement est mis a jour automatiquement."
              error={errors.postal_code?.message}
            >
              <Input
                aria-label="Code postal"
                value={values.postal_code ?? ''}
                onChange={(event) => {
                  const digits = event.target.value.replace(/\D/g, '').slice(0, 5);
                  form.setValue('postal_code', digits, { shouldDirty: true, shouldValidate: true });
                  form.setValue(
                    'department',
                    digits.length >= 2 ? getDepartmentFromPostalCode(digits) : '',
                    { shouldDirty: true }
                  );
                }}
                className="h-10 rounded-lg"
              />
            </FieldShell>

            <FieldShell label="Ville" error={errors.city?.message}>
              <Input aria-label="Ville" autoComplete="address-level2" {...form.register('city')} className="h-10 rounded-lg" />
            </FieldShell>

            <FieldShell label="Departement" helper="Calcule depuis le code postal quand il est connu.">
              <Input aria-label="Departement" value={values.department ?? ''} readOnly className="h-10 rounded-lg" />
            </FieldShell>

            <FieldShell
              label="Agence"
              helper={userRole === 'tcs' ? 'Fixee par ton contexte agence.' : 'Agence proprietaire de la fiche.'}
              error={errors.agency_id?.message}
            >
              <Select
                value={values.agency_id ?? ''}
                onValueChange={(nextValue) => form.setValue('agency_id', nextValue, {
                  shouldDirty: true,
                  shouldValidate: true
                })}
                disabled={userRole === 'tcs'}
              >
                <SelectTrigger aria-label="Agence" className="h-10 rounded-lg">
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

            <FieldShell label="Notes" helper="Visible uniquement dans les vues internes." className="md:col-span-2">
              <Textarea aria-label="Notes" {...form.register('notes')} className="min-h-[140px] rounded-lg" />
            </FieldShell>
          </div>
        </Card>

        {!isIndividualClient ? (
          <Card variant="section" className="border-border/60 bg-card shadow-sm">
            <div className="border-b border-border/60 px-5 py-5">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">Donnees officielles</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Informations importees ou completees manuellement avant validation.
              </p>
            </div>
            <div className="grid gap-4 p-5 md:grid-cols-3">
              <FieldShell label="SIRET">
                <Input aria-label="SIRET" {...form.register('siret')} className="h-10 rounded-lg" />
              </FieldShell>
              <FieldShell label="SIREN">
                <Input aria-label="SIREN" {...form.register('siren')} className="h-10 rounded-lg" />
              </FieldShell>
              <FieldShell label="Code NAF">
                <Input aria-label="Code NAF" {...form.register('naf_code')} className="h-10 rounded-lg" />
              </FieldShell>

              <FieldShell label="Nom officiel" className="md:col-span-2">
                <Input aria-label="Nom officiel" {...form.register('official_name')} className="h-10 rounded-lg" />
              </FieldShell>
              <FieldShell label="Source">
                <Input
                  aria-label="Source officielle"
                  value={values.official_data_source ? 'API Recherche d entreprises' : 'Saisie manuelle'}
                  readOnly
                  className="h-10 rounded-lg"
                />
              </FieldShell>
            </div>
          </Card>
        ) : null}

        {effectiveIntent === 'client' ? (
          <Card variant="section" className="border-border/60 bg-card shadow-sm">
            <div className="border-b border-border/60 px-5 py-5">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">Compte client</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {isIndividualClient
                  ? 'Le compte particulier reste comptant et sans commercial CIR.'
                  : 'Donnees specifiques au compte et a l affectation commerciale.'}
              </p>
            </div>
            <div className="grid gap-4 p-5 md:grid-cols-2">
              <FieldShell
                label="Numero de compte"
                helper="Obligatoire pour creer un client."
                error={errors.client_number?.message}
              >
                <Input
                  aria-label="Numero de compte"
                  value={values.client_number ?? ''}
                  onChange={(event) => form.setValue(
                    'client_number',
                    event.target.value.replace(/\D/g, '').slice(0, 10),
                    { shouldDirty: true, shouldValidate: true }
                  )}
                  className="h-10 rounded-lg"
                />
              </FieldShell>

              {isIndividualClient ? (
                <FieldShell label="Type de compte">
                  <Input aria-label="Type de compte" value="Comptant" readOnly className="h-10 rounded-lg" />
                </FieldShell>
              ) : (
                <FieldShell label="Type de compte">
                  <Select
                    value={values.account_type ?? 'term'}
                    onValueChange={(nextValue: 'term' | 'cash') => form.setValue('account_type', nextValue, {
                      shouldDirty: true,
                      shouldValidate: true
                    })}
                  >
                    <SelectTrigger aria-label="Type de compte" className="h-10 rounded-lg">
                      <SelectValue placeholder="Type de compte" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="term">Compte a terme</SelectItem>
                      <SelectItem value="cash">Comptant</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldShell>
              )}

              {isIndividualClient ? (
                <FieldShell label="Commercial CIR" className="md:col-span-2">
                  <Input aria-label="Commercial CIR" value="Aucun commercial affecte" readOnly className="h-10 rounded-lg" />
                </FieldShell>
              ) : (
                <FieldShell label="Commercial CIR" className="md:col-span-2">
                  <Select
                    value={values.cir_commercial_id || '__none__'}
                    onValueChange={(nextValue) => form.setValue(
                      'cir_commercial_id',
                      nextValue === '__none__' ? '' : nextValue,
                      { shouldDirty: true, shouldValidate: true }
                    )}
                  >
                    <SelectTrigger aria-label="Commercial CIR" className="h-10 rounded-lg">
                      <SelectValue placeholder="Aucun commercial affecte" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Aucun commercial affecte</SelectItem>
                      {commercials.map((commercial) => (
                        <SelectItem key={commercial.id} value={commercial.id}>
                          {commercial.display_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FieldShell>
              )}
            </div>
          </Card>
        ) : null}
      </div>

      <aside className="space-y-4 xl:sticky xl:top-0">
        <Card variant="section" className="border-border/60 bg-card shadow-sm">
          <div className="border-b border-border/60 px-5 py-5">
            <div className="flex items-start gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg border border-primary/20 bg-primary/8 text-primary">
                {isIndividualClient ? <UserRound className="size-4" /> : <Building2 className="size-4" />}
              </div>
              <div>
                <p className="text-base font-semibold text-foreground">Resume de la fiche</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Synthese visible avant la validation finale.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4 px-5 py-5 text-sm text-muted-foreground">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MapPin className="size-4" />
                <span className="font-medium text-foreground">{values.city || 'Ville non renseignee'}</span>
              </div>
              <p>Agence: <span className="font-medium text-foreground">{getAgencyLabel(agencies, values.agency_id)}</span></p>
              <p>Source: <span className="font-medium text-foreground">{values.official_data_source ? 'Officielle' : 'Manuelle'}</span></p>
            </div>

            {isIndividualClient ? (
              <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  <UserRound className="size-3.5" />
                  Contact principal
                </div>
                <p className="mt-3 font-medium text-foreground">
                  {[values.first_name, values.last_name].filter((entry) => entry.trim().length > 0).join(' ') || 'Non renseigne'}
                </p>
                <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {values.phone ? <p className="inline-flex items-center gap-2"><Phone className="size-3.5" /> {values.phone}</p> : null}
                  {values.email ? <p className="inline-flex items-center gap-2"><Mail className="size-3.5" /> {values.email}</p> : null}
                </div>
              </div>
            ) : selectedCompany ? (
              <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  <ShieldCheck className="size-3.5" />
                  Etablissement retenu
                </div>
                <p className="mt-3 font-medium text-foreground">
                  {[selectedCompany.postal_code, selectedCompany.city].filter(Boolean).join(' ') || selectedCompany.name}
                </p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{selectedCompany.address ?? 'Adresse non diffusee'}</p>
              </div>
            ) : null}

            <div className="rounded-lg border border-border/60 bg-background p-4">
              <p className="text-sm font-medium text-foreground">Checklist avant validation</p>
              <div className="mt-3 space-y-2">
                {remainingRequiredFields.length > 0 ? remainingRequiredFields.map((field) => (
                  <div key={field} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <AlertTriangle className="size-4 text-warning" />
                    {field}
                  </div>
                )) : (
                  <div className="flex items-center gap-2 text-sm text-emerald-700">
                    <CircleCheckBig className="size-4" />
                    Champs requis complets
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-border/60 bg-background p-4">
              <p className="text-sm font-medium text-foreground">Controle doublons</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant={duplicateMatches.length > 0 ? 'warning' : 'success'}>
                  {duplicateMatches.length > 0 ? 'A verifier' : 'Aucun doublon'}
                </Badge>
                {isIndividualClient ? <Badge variant="outline">Client particulier</Badge> : null}
              </div>
            </div>
          </div>
        </Card>
      </aside>
    </div>
  );
};

export default EntityOnboardingDetailsStep;
