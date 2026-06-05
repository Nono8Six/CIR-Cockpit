import { AlertCircle } from 'lucide-react';

import { Input } from '../../ui/inputs/basic/Input';
import { Textarea } from '../../ui/inputs/basic/Textarea';
import { cn } from '@/lib/utils';
import {
  EntityRecordWizardField,
  EntityRecordWizardSection,
  wizardInputClasses
} from '@/components/entity-record-wizard/EntityRecordWizardFields';
import type { SupplierDraft } from './use-supplier-onboarding';

interface SupplierDetailsStepProps {
  draft: SupplierDraft;
  updateDraft: (key: keyof SupplierDraft, value: string) => void;
  updateSupplierCode: (value: string) => void;
  updateSupplierNumber: (value: string) => void;
  hasAttemptedNext: boolean;
  isNameValid: boolean;
  isContactValid: boolean;
}

/**
 * Step 2 component of the supplier creation wizard. Renders all manual fields
 * (general details, contacts, address, legal identifier fields, notes).
 * @param {SupplierDetailsStepProps} props - The component props.
 * @returns {JSX.Element} The rendered details step.
 */
const SupplierDetailsStep = ({
  draft,
  updateDraft,
  updateSupplierCode,
  updateSupplierNumber,
  hasAttemptedNext,
  isNameValid,
  isContactValid
}: SupplierDetailsStepProps) => {
  return (
    <>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Étape 2</p>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Fiche d&apos;informations</h1>
        <p className="mt-1 text-sm text-muted-foreground">Renseigne les coordonnées et identifiants permanents du fournisseur.</p>
      </div>
      <div className="flex flex-col gap-6">
        {/* General Info */}
        <EntityRecordWizardSection title="Informations Générales" eyebrow="Fournisseur">
          <div className="grid gap-4 md:grid-cols-12">
            <EntityRecordWizardField label="Nom du fournisseur" required className="md:col-span-6">
              <Input
                name="admin-supplier-name"
                value={draft.name}
                onChange={(event) => updateDraft('name', event.target.value)}
                placeholder="Ex: EDF SAS"
                aria-label="Nom fournisseur admin"
                aria-invalid={hasAttemptedNext && !isNameValid ? 'true' : 'false'}
                className={cn(wizardInputClasses, hasAttemptedNext && !isNameValid && 'border-destructive focus-visible:ring-destructive/30')}
              />
              {hasAttemptedNext && !isNameValid ? (
                <span className="text-[10px] font-semibold text-destructive flex items-center gap-1 mt-0.5">
                  <AlertCircle className="size-3" /> Le nom est requis.
                </span>
              ) : null}
            </EntityRecordWizardField>
            <EntityRecordWizardField label="Code interne" className="md:col-span-3">
              <Input
                name="admin-supplier-code"
                value={draft.supplier_code}
                onChange={(event) => updateSupplierCode(event.target.value)}
                placeholder="Ex: EDF"
                aria-label="Code interne fournisseur"
                className={cn(wizardInputClasses, 'font-mono uppercase')}
                maxLength={4}
              />
            </EntityRecordWizardField>
            <EntityRecordWizardField label="N° fournisseur" className="md:col-span-3">
              <Input
                name="admin-supplier-number"
                value={draft.supplier_number}
                onChange={(event) => updateSupplierNumber(event.target.value)}
                placeholder="Ex: 400123"
                aria-label="Numéro fournisseur"
                inputMode="numeric"
                className={wizardInputClasses}
                maxLength={15}
              />
            </EntityRecordWizardField>
          </div>
        </EntityRecordWizardSection>

        <EntityRecordWizardSection title="Contacts Principaux" eyebrow="Contact">
          <div className="grid gap-4 md:grid-cols-2">
            <EntityRecordWizardField label="Téléphone principal" required>
              <Input
                name="admin-supplier-phone"
                value={draft.primary_phone}
                onChange={(event) => updateDraft('primary_phone', event.target.value)}
                placeholder="Ex: +33 4 72 00 00 00"
                aria-label="Téléphone fournisseur admin"
                aria-invalid={hasAttemptedNext && !isContactValid ? 'true' : 'false'}
                className={cn(wizardInputClasses, hasAttemptedNext && !isContactValid && 'border-destructive focus-visible:ring-destructive/30')}
              />
            </EntityRecordWizardField>
            <EntityRecordWizardField label="Email principal" required>
              <Input
                name="admin-supplier-email"
                value={draft.primary_email}
                onChange={(event) => updateDraft('primary_email', event.target.value)}
                placeholder="Ex: contact@edf.fr"
                aria-label="Email fournisseur admin"
                type="email"
                aria-invalid={hasAttemptedNext && !isContactValid ? 'true' : 'false'}
                className={cn(wizardInputClasses, hasAttemptedNext && !isContactValid && 'border-destructive focus-visible:ring-destructive/30')}
              />
            </EntityRecordWizardField>
          </div>
          {hasAttemptedNext && !isContactValid ? (
            <span className="text-[10px] font-semibold text-destructive flex items-center gap-1 mt-0.5">
              <AlertCircle className="size-3" /> Un numéro de téléphone ou un email de contact est requis.
            </span>
          ) : null}
        </EntityRecordWizardSection>

        <EntityRecordWizardSection title="Localisation" eyebrow="Adresse">
          <div className="grid gap-4 md:grid-cols-12">
            <EntityRecordWizardField label="Adresse" className="md:col-span-12">
              <Input
                name="admin-supplier-address"
                value={draft.address}
                onChange={(event) => updateDraft('address', event.target.value)}
                placeholder="Ex: 20 rue de la République"
                aria-label="Adresse fournisseur admin"
                className={wizardInputClasses}
              />
            </EntityRecordWizardField>
            <EntityRecordWizardField label="Code postal" className="md:col-span-3">
              <Input
                name="admin-supplier-postal-code"
                value={draft.postal_code}
                onChange={(event) => updateDraft('postal_code', event.target.value.replace(/\D/g, '').slice(0, 5))}
                placeholder="Ex: 69002"
                aria-label="Code postal fiche fournisseur"
                className={wizardInputClasses}
              />
            </EntityRecordWizardField>
            <EntityRecordWizardField label="Ville" className="md:col-span-6">
              <Input
                name="admin-supplier-city"
                value={draft.city}
                onChange={(event) => updateDraft('city', event.target.value)}
                placeholder="Ex: Lyon"
                aria-label="Ville fiche fournisseur"
                className={wizardInputClasses}
              />
            </EntityRecordWizardField>
            <EntityRecordWizardField label="Département" className="md:col-span-3">
              <Input
                name="admin-supplier-department"
                value={draft.department}
                onChange={(event) => updateDraft('department', event.target.value.toUpperCase())}
                placeholder="Ex: 69"
                aria-label="Département fiche fournisseur"
                className={wizardInputClasses}
              />
            </EntityRecordWizardField>
          </div>
        </EntityRecordWizardSection>

        <EntityRecordWizardSection title="Identifiants Légaux" eyebrow="Base SIRENE">
          <div className="grid gap-4 md:grid-cols-3">
            <EntityRecordWizardField label="SIREN">
              <Input
                name="admin-supplier-siren"
                value={draft.siren}
                onChange={(event) => updateDraft('siren', event.target.value)}
                placeholder="Ex: 552081317"
                aria-label="SIREN fournisseur"
                className={wizardInputClasses}
              />
            </EntityRecordWizardField>
            <EntityRecordWizardField label="SIRET">
              <Input
                name="admin-supplier-siret"
                value={draft.siret}
                onChange={(event) => updateDraft('siret', event.target.value)}
                placeholder="Ex: 55208131700010"
                aria-label="SIRET fournisseur"
                className={wizardInputClasses}
              />
            </EntityRecordWizardField>
            <EntityRecordWizardField label="Code NAF / APE">
              <Input
                name="admin-supplier-naf"
                value={draft.naf_code}
                onChange={(event) => updateDraft('naf_code', event.target.value)}
                placeholder="Ex: 35.11Z"
                aria-label="NAF fiche fournisseur"
                className={cn(wizardInputClasses, 'font-mono uppercase')}
              />
            </EntityRecordWizardField>
          </div>
        </EntityRecordWizardSection>

        <EntityRecordWizardSection title="Notes & Observations" eyebrow="Suivi">
          <EntityRecordWizardField label="Notes complémentaires">
            <Textarea
              name="admin-supplier-notes"
              value={draft.notes}
              onChange={(event) => updateDraft('notes', event.target.value)}
              placeholder="Observations, conditions commerciales, interlocuteurs principaux…"
              aria-label="Notes fournisseur admin"
              className="min-h-24 rounded-md border-border bg-background text-sm shadow-none focus-visible:ring-ring/45"
            />
          </EntityRecordWizardField>
        </EntityRecordWizardSection>
      </div>
    </>
  );
};

export default SupplierDetailsStep;
