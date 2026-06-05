import { useNavigate } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';

import { useAppSessionStateContext } from '../../hooks/session/useAppSession';
import { Button } from '../ui/inputs/basic/Button';
import { cn } from '@/lib/utils';
import { EntityRecordWizardProgress } from '@/components/entity-record-wizard/EntityRecordWizardProgress';
import {
  EntityRecordWizardHeader,
  EntityRecordWizardShell,
  EntityRecordWizardWorkspace
} from '@/components/entity-record-wizard/EntityRecordWizardShell';
import { DEFAULT_SUPPLIER_SEARCH } from './supplierDirectorySearch';
import useSupplierOnboarding, { Step } from './create-wizard/use-supplier-onboarding';
import SupplierSearchStep from './create-wizard/search-step/supplier-search-step';
import SupplierDetailsStep from './create-wizard/supplier-details-step';
import SupplierReviewStep from './create-wizard/supplier-review-step';
import SupplierIntelligenceAside from './create-wizard/supplier-intelligence-aside';

const stepLabels: Record<Step, string> = {
  search: 'Recherche',
  details: 'Informations',
  review: 'Validation'
};

const supplierSteps = (['search', 'details', 'review'] as Step[]).map((step) => ({
  id: step,
  title: stepLabels[step]
}));

/**
 * Renders the main admin page for creating a new supplier.
 * Orchestrates the onboarding sub-components and sidebar layout.
 * @returns {JSX.Element} The supplier creation page layout.
 */
const AdminSupplierCreatePage = () => {
  const navigate = useNavigate({ from: '/admin/suppliers/new' });
  const sessionState = useAppSessionStateContext();
  const userRole = sessionState.profile?.role ?? 'tcs';

  const onboarding = useSupplierOnboarding();

  if (userRole === 'tcs') {
    return (
      <section className="flex h-full items-center justify-center rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
        Création fournisseur réservée aux administrateurs.
      </section>
    );
  }

  const goBackToList = () => void navigate({ to: '/admin/suppliers', search: () => DEFAULT_SUPPLIER_SEARCH });
  const headerLeading = (
    <>
          <Button
            type="button"
            variant="ghost"
            size="dense"
            onClick={goBackToList}
          >
            <ArrowLeft data-icon="inline-start" aria-hidden="true" />
            Retour
          </Button>
    </>
  );

  const headerProgress = (
    <EntityRecordWizardProgress
      label="Progression création fournisseur"
      steps={supplierSteps}
      currentIndex={onboarding.activeStepIndex}
    />
  );

  const headerActions = (
    <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="dense"
            onClick={goBackToList}
          >
            Annuler
          </Button>
          {onboarding.step === 'search' ? (
            <Button
              type="button"
              size="dense"
              onClick={() => {
                onboarding.setHasAttemptedNext(false);
                onboarding.setStep('details');
              }}
            >
              Saisie manuelle
            </Button>
          ) : null}
          {onboarding.step === 'details' ? (
            <Button type="button" size="dense" onClick={onboarding.handleContinueToReview}>
              Continuer
            </Button>
          ) : null}
          {onboarding.step === 'review' ? (
            <Button
              type="button"
              size="dense"
              disabled={onboarding.saveSupplier.isPending}
              onClick={() => void onboarding.save()}
              className={cn(onboarding.saveSupplier.isPending && 'opacity-70 cursor-not-allowed')}
            >
              {onboarding.saveSupplier.isPending ? 'Création…' : 'Créer'}
            </Button>
          ) : null}
    </div>
  );

  const main = (
          <div className="mx-auto flex max-w-4xl flex-col gap-6">
            {onboarding.step === 'search' && (
              <SupplierSearchStep
                searchFilters={onboarding.searchFilters}
                selection={onboarding.selection}
              />
            )}

            {onboarding.step === 'details' && (
              <SupplierDetailsStep
                draft={onboarding.draft}
                updateDraft={onboarding.updateDraft}
                updateSupplierCode={onboarding.updateSupplierCode}
                updateSupplierNumber={onboarding.updateSupplierNumber}
                hasAttemptedNext={onboarding.hasAttemptedNext}
                isNameValid={onboarding.isNameValid}
                isContactValid={onboarding.isContactValid}
              />
            )}

            {onboarding.step === 'review' && <SupplierReviewStep draft={onboarding.draft} />}
          </div>
  );

  const aside = (
        <SupplierIntelligenceAside
          step={onboarding.step}
          draft={onboarding.draft}
          selectedGroup={onboarding.selection.computed.selectedGroup}
          selectedCompany={onboarding.selection.selectionState.selectedCompany}
          importSelectedCompany={onboarding.importSelectedCompany}
        />
  );

  return (
    <EntityRecordWizardShell className="rounded-xl border border-border-subtle">
      <EntityRecordWizardHeader
        leading={headerLeading}
        progress={headerProgress}
        actions={headerActions}
      />
      <EntityRecordWizardWorkspace main={main} aside={aside} />
    </EntityRecordWizardShell>
  );
};

export default AdminSupplierCreatePage;
