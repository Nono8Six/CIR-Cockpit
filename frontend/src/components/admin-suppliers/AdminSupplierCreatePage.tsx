import { useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Check, ChevronRight } from 'lucide-react';

import { useAppSessionStateContext } from '../../hooks/session/useAppSession';
import { Button } from '../ui/inputs/basic/Button';
import { cn } from '@/lib/utils';
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

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border-subtle bg-background">
      <header className="flex min-h-14 items-center justify-between gap-3 border-b border-border-subtle px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="dense"
            onClick={() => void navigate({ to: '/admin/suppliers', search: () => DEFAULT_SUPPLIER_SEARCH })}
          >
            <ArrowLeft data-icon="inline-start" aria-hidden="true" />
            Retour
          </Button>
          <nav aria-label="Progression création fournisseur" className="hidden md:block">
            <ol className="flex items-center gap-1.5 bg-surface-2 p-1 rounded-lg border border-border-subtle">
              {(['search', 'details', 'review'] as Step[]).map((item, index) => {
                const isCompleted = index < onboarding.activeStepIndex;
                const isActive = index === onboarding.activeStepIndex;
                return (
                  <li key={item} className="relative flex items-center">
                    <div
                      className={cn(
                        'relative flex items-center gap-2 h-7 rounded-md px-3 text-[12.5px] transition-[background-color,color,box-shadow,transform] select-none',
                        isActive
                          ? 'border border-border bg-card font-semibold text-foreground shadow-sm'
                          : 'border border-transparent text-muted-foreground font-medium'
                      )}
                    >
                      {isActive ? (
                        <span className="absolute bottom-0 left-[15%] right-[15%] h-[2.5px] rounded-t-full bg-primary" />
                      ) : null}
                      <span
                        className={cn(
                          'flex size-4.5 items-center justify-center rounded-full text-[9px] font-bold shrink-0 transition-colors',
                          isCompleted && 'bg-success text-success-foreground',
                          isActive && 'bg-primary text-primary-foreground',
                          !isCompleted && !isActive && 'bg-surface-3 text-muted-foreground/60 border border-border/50'
                        )}
                      >
                        {isCompleted ? <Check className="size-2.5" /> : index + 1}
                      </span>
                      <span className="truncate">{stepLabels[item]}</span>
                    </div>
                    {index < 2 ? <ChevronRight className="size-3 text-muted-foreground/45 mx-0.5" /> : null}
                  </li>
                );
              })}
            </ol>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="dense"
            onClick={() => void navigate({ to: '/admin/suppliers', search: () => DEFAULT_SUPPLIER_SEARCH })}
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
      </header>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_380px]">
        <main className="min-h-0 overflow-y-auto p-6 lg:p-10">
          <div className="mx-auto flex max-w-3xl flex-col gap-6">
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
        </main>
        <SupplierIntelligenceAside
          step={onboarding.step}
          draft={onboarding.draft}
          selectedGroup={onboarding.selection.computed.selectedGroup}
          selectedCompany={onboarding.selection.selectionState.selectedCompany}
          importSelectedCompany={onboarding.importSelectedCompany}
        />
      </div>
    </section>
  );
};

export default AdminSupplierCreatePage;
