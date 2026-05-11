import { ArrowLeft, LoaderCircle, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import type {
  DirectoryCommercialOption,
  DirectoryListRow,
} from "shared/schemas/directory.schema";
import type { ClientPayload } from "@/services/clients/saveClient";
import type { EntityPayload } from "@/services/entities/saveEntity";
import { cn } from "@/lib/utils";
import type { Agency, UserRole } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import EntityOnboardingDetailsStep from "@/components/entity-onboarding/EntityOnboardingDetailsStep";
import EntityOnboardingIntentStep from "@/components/entity-onboarding/EntityOnboardingIntentStep";
import EntityOnboardingReviewStep from "@/components/entity-onboarding/EntityOnboardingReviewStep";
import EntityOnboardingSearchStep from "@/components/entity-onboarding/EntityOnboardingSearchStep";
import EntityOnboardingSidebar from "@/components/entity-onboarding/EntityOnboardingSidebar";
import type {
  EntityOnboardingSeed,
  OnboardingIntent,
  OnboardingMode,
  OnboardingSourceLabel,
} from "@/components/entity-onboarding/entityOnboarding.types";
import {
  STEP_DEFINITIONS,
  useEntityOnboardingFlow,
} from "@/components/entity-onboarding/useEntityOnboardingFlow";

type SavedEntityResult = {
  id?: string;
  client_number?: string | null;
};

type EntityOnboardingDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agencies: Agency[];
  userRole: UserRole;
  activeAgencyId: string | null;
  commercials?: DirectoryCommercialOption[];
  mode?: OnboardingMode;
  defaultIntent?: OnboardingIntent;
  allowedIntents?: OnboardingIntent[];
  initialEntity?: EntityOnboardingSeed | null;
  sourceLabel?: OnboardingSourceLabel;
  surface?: "dialog" | "page";
  backLabel?: string;
  onSaveClient?: (payload: ClientPayload) => Promise<SavedEntityResult | void>;
  onSaveProspect?: (payload: EntityPayload) => Promise<SavedEntityResult | void>;
  onComplete?: (result: {
    intent: OnboardingIntent;
    client_number?: string | null;
    entity_id?: string | null;
  }) => void;
  onOpenDuplicate?: (record: DirectoryListRow) => void;
};

const EntityOnboardingDialog = ({
  open,
  onOpenChange,
  agencies,
  userRole,
  activeAgencyId,
  commercials = [],
  mode = "create",
  defaultIntent = "client",
  allowedIntents,
  initialEntity = null,
  sourceLabel = "Annuaire",
  surface = "dialog",
  backLabel = "Retour",
  onSaveClient,
  onSaveProspect,
  onComplete,
  onOpenDuplicate,
}: EntityOnboardingDialogProps) => {
  const flow = useEntityOnboardingFlow({
    open,
    onOpenChange,
    userRole,
    activeAgencyId,
    mode,
    defaultIntent,
    allowedIntents,
    initialEntity,
    onSaveClient,
    onSaveProspect,
    onComplete,
    onOpenDuplicate,
  });

  const {
    form,
    stepper,
    values,
    effectiveIntent,
    isIndividualClient,
    intents,
    isIntentLocked,
    shouldSkipIntent,
    currentStepIndex,
    departmentOptions,

    searchDraft,
    setSearchDraft,
    departmentFilter,
    setDepartmentFilter,
    statusFilter,
    setStatusFilter,
    manualEntry,
    allowManualEntry,
    toggleManualEntry,

    companyGroups,
    hasStatusFilteredOutResults,
    selectedGroup,
    displaySelectedCompany,
    isSearchFetching,
    isSearchStale,

    duplicateMatches,
    duplicatesFetching,

    companyDetails,
    companyDetailsUnavailable,
    companyDetailsLoading,

    missingChecklist,
    canContinueCompany,

    stepError,
    isSaving,
    isCloseConfirmOpen,
    setIsCloseConfirmOpen,

    reducedMotion,

    handleIntentChange,
    handleClientKindChange,
    handleGroupSelect,
    applyCompany,
    handleCompanyNext,
    handleDetailsNext,
    handleBack,
    handleSubmit,
    requestClose,
    confirmClose,
    handleDialogOpenChange,
    goToCompletedStep,
  } = flow;

  const title =
    mode === "convert"
      ? "Convertir le prospect en client"
      : "Nouvelle fiche entreprise";
  const renderedSteps = STEP_DEFINITIONS.map((step) => {
    if (step.id === "company" && isIndividualClient) {
      return {
        ...step,
        description: "Qualifier le particulier et verifier les doublons",
      };
    }

    if (step.id === "details" && isIndividualClient) {
      return {
        ...step,
        description: "Completer les coordonnees et le compte",
      };
    }

    return step;
  });
  const showHeaderBack = surface === "page";
  const showFooterBack =
    stepper.flow.is("review") ||
    stepper.flow.is("details") ||
    (!shouldSkipIntent && stepper.flow.is("company"));
  const primaryButtonLabel = stepper.flow.is("review")
    ? mode === "convert"
      ? "Convertir en client"
      : effectiveIntent === "client"
        ? "Creer le client"
        : "Creer le prospect"
    : "Continuer";
  const footerMessage =
    stepError ??
    (stepper.flow.is("company")
      ? "Selection et doublons visibles avant creation."
      : stepper.flow.is("details")
        ? "Champs obligatoires verifies en ligne."
        : stepper.flow.is("review")
          ? "Resume final exactement conforme aux donnees sauvegardees."
          : "Le type choisi ajuste tout le reste du parcours.");
  const stepMotionProps = reducedMotion
    ? {}
    : {
        initial: { opacity: 0, x: 8 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -8 },
        transition: { duration: 0.15 },
      };

  const content = (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden bg-background",
        surface === "page" ? "flex-1" : "border-0",
      )}
    >
      <header className="flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-border-subtle bg-background px-4 py-2 sm:px-6 lg:flex-nowrap lg:py-0">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1.5">
          {showHeaderBack ? (
            <Button
              type="button"
              variant="ghost"
              size="dense"
              className="-ml-2 shrink-0 px-2 text-muted-foreground hover:bg-surface-1 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
              onClick={requestClose}
              aria-label={`${backLabel} (quitter le parcours)`}
            >
              <ArrowLeft className="size-4" />
              <span className="truncate">{backLabel}</span>
            </Button>
          ) : null}
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge
              variant="outline"
              density="dense"
              className="gap-1.5 border-border-subtle bg-surface-1/50 text-muted-foreground"
            >
              {mode === "convert" ? "Conversion" : "Nouveau"}
            </Badge>
            <Badge
              variant="outline"
              density="dense"
              className="border-border-subtle bg-background/80 text-muted-foreground"
            >
              {sourceLabel}
            </Badge>
            {values.official_data_source ? (
              <Badge
                variant="success"
                density="dense"
                className="border-success/20 bg-success/5 text-success"
              >
                <Sparkles className="mr-1 size-3" aria-hidden="true" />
                Officiel
              </Badge>
            ) : null}
          </div>
          <div
            aria-hidden="true"
            className="hidden h-4 w-px bg-border-subtle md:block"
          />

          <nav
            aria-label="Progression du parcours"
            className="hidden min-w-0 md:block"
          >
            <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] font-medium">
              {renderedSteps.map((step, index) => {
                const isCurrent = currentStepIndex === index;
                const isClickable = index < currentStepIndex;

                return (
                  <li
                    key={step.id}
                    className="flex items-center"
                    aria-current={isCurrent ? "step" : undefined}
                  >
                    {isClickable ? (
                      <button
                        type="button"
                        aria-label={`Revenir à l'étape ${step.title}`}
                        onClick={() => goToCompletedStep(step.id)}
                        className="rounded-sm px-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                      >
                        {step.title}
                      </button>
                    ) : (
                      <span
                        className={cn(
                          "px-1",
                          isCurrent
                            ? "text-foreground"
                            : "text-muted-foreground/60",
                        )}
                      >
                        {step.title}
                      </span>
                    )}
                    {index < renderedSteps.length - 1 && (
                      <span
                        aria-hidden="true"
                        className="ml-1 text-muted-foreground/40"
                      >
                        ›
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        </div>

        <div
          className="flex shrink-0 flex-wrap items-center justify-end gap-2"
          role="group"
          aria-label="Actions du parcours"
        >
          {showFooterBack ? (
            <Button
              type="button"
              variant="ghost"
              size="dense"
              className="text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
              onClick={handleBack}
              aria-label="Revenir à l'étape précédente"
            >
              Étape précédente
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="dense"
            className="text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
            onClick={requestClose}
          >
            Annuler
          </Button>
          <Button
            type="button"
            size="dense"
            disabled={
              isSaving || (stepper.flow.is("company") && !canContinueCompany)
            }
            className="h-8 shadow-sm transition-transform motion-safe:active:scale-95 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
            onClick={() => {
              if (stepper.flow.is("intent")) {
                stepper.navigation.goTo("company");
                return;
              }
              if (stepper.flow.is("company")) {
                void handleCompanyNext();
                return;
              }
              if (stepper.flow.is("details")) {
                void handleDetailsNext();
                return;
              }
              void handleSubmit();
            }}
          >
            {isSaving ? (
              <LoaderCircle
                className="mr-2 size-3.5 animate-spin"
                aria-hidden="true"
              />
            ) : null}
            {primaryButtonLabel}
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="flex min-h-0 flex-1 flex-col bg-background">
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 sm:p-8 lg:px-10 xl:px-12">
            <AnimatePresence mode="wait" initial={false}>
              {stepper.flow.is("intent") ? (
                <motion.div
                  key="step-intent"
                  className="mx-auto max-w-2xl"
                  {...stepMotionProps}
                >
                  <div className="mb-8">
                    <h2 className="text-xl font-semibold tracking-tight text-foreground">
                      Type de profil
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Definit le parcours et les champs obligatoires a collecter.
                    </p>
                  </div>
                  <EntityOnboardingIntentStep
                    effectiveIntent={effectiveIntent}
                    intents={intents}
                    isIntentLocked={isIntentLocked}
                    mode={mode}
                    clientKind={values.client_kind}
                    onIntentChange={handleIntentChange}
                    onClientKindChange={handleClientKindChange}
                  />
                </motion.div>
              ) : null}

              {stepper.flow.is("company") ? (
                <motion.div
                  key="step-company"
                  className="mx-auto max-w-3xl"
                  {...stepMotionProps}
                >
                  <EntityOnboardingSearchStep
                    form={form}
                    values={values}
                    isIndividualClient={isIndividualClient}
                    searchDraft={searchDraft}
                    onSearchDraftChange={setSearchDraft}
                    department={departmentFilter}
                    onDepartmentChange={setDepartmentFilter}
                    statusFilter={statusFilter}
                    onStatusFilterChange={setStatusFilter}
                    departmentOptions={departmentOptions}
                    allowManualEntry={allowManualEntry}
                    manualEntry={manualEntry}
                    onToggleManualEntry={toggleManualEntry}
                    isFetching={isSearchFetching}
                    isStale={isSearchStale}
                    groups={companyGroups}
                    hasStatusFilteredOutResults={hasStatusFilteredOutResults}
                    selectedGroup={selectedGroup}
                    onGroupSelect={handleGroupSelect}
                    selectedCompany={displaySelectedCompany}
                    onEstablishmentSelect={applyCompany}
                    duplicateMatches={duplicateMatches}
                    duplicatesLoading={duplicatesFetching}
                    onOpenDuplicate={onOpenDuplicate}
                  />
                </motion.div>
              ) : null}

              {stepper.flow.is("details") ? (
                <motion.div
                  key="step-details"
                  className="mx-auto max-w-2xl"
                  {...stepMotionProps}
                >
                  <div className="mb-8">
                    <h2 className="text-xl font-semibold tracking-tight text-foreground">
                      Informations complementaires
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Completer les donnees necessaires a la facturation et au
                      rattachement.
                    </p>
                  </div>
                  <EntityOnboardingDetailsStep
                    form={form}
                    values={values}
                    effectiveIntent={effectiveIntent}
                    isIndividualClient={isIndividualClient}
                    agencies={agencies}
                    commercials={commercials}
                    userRole={userRole}
                    selectedCompany={displaySelectedCompany}
                    duplicateMatches={duplicateMatches}
                    remainingRequiredFields={missingChecklist}
                  />
                </motion.div>
              ) : null}

              {stepper.flow.is("review") ? (
                <motion.div
                  key="step-review"
                  className="mx-auto max-w-2xl"
                  {...stepMotionProps}
                >
                  <div className="mb-8">
                    <h2 className="text-xl font-semibold tracking-tight text-foreground">
                      Confirmation finale
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Verifie les informations avant l insertion dans la base de
                      donnees.
                    </p>
                  </div>
                  <EntityOnboardingReviewStep
                    values={values}
                    agencies={agencies}
                    effectiveIntent={effectiveIntent}
                    isIndividualClient={isIndividualClient}
                    selectedCompany={displaySelectedCompany}
                    duplicateMatches={duplicateMatches}
                  />
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>

        <EntityOnboardingSidebar
          company={displaySelectedCompany}
          selectedGroup={selectedGroup}
          companyDetails={companyDetails?.company}
          companyDetailsUnavailable={companyDetailsUnavailable}
          companyDetailsLoading={companyDetailsLoading}
          duplicateMatches={duplicateMatches}
          stepError={stepError}
          missingChecklist={missingChecklist}
          footerMessage={footerMessage}
          isDetailsStep={stepper.flow.is("details")}
          isReviewStep={stepper.flow.is("review")}
          onOpenDuplicate={onOpenDuplicate}
        />
      </div>
    </div>
  );

  const closeConfirmDialog = (
    <AlertDialog open={isCloseConfirmOpen} onOpenChange={setIsCloseConfirmOpen}>
      <AlertDialogContent className="border-border-subtle">
        <AlertDialogHeader>
          <AlertDialogTitle>Quitter le parcours ?</AlertDialogTitle>
          <AlertDialogDescription>
            Les modifications non enregistrees seront perdues si tu fermes
            maintenant ce flux.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Revenir au formulaire</AlertDialogCancel>
          <AlertDialogAction onClick={confirmClose}>Quitter</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  if (surface === "page") {
    return (
      <>
        {closeConfirmDialog}
        {content}
      </>
    );
  }

  return (
    <>
      {closeConfirmDialog}

      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent
          showCloseButton={false}
          overlayClassName="bg-foreground/25 backdrop-blur-[6px]"
          className="h-[min(92vh,880px)] w-[min(94vw,1240px)] max-w-[1240px] overflow-hidden rounded-xl border border-border-subtle bg-background p-0 shadow-2xl sm:rounded-xl"
        >
          <DialogTitle className="sr-only">{title}</DialogTitle>
          <DialogDescription className="sr-only">
            Flux de creation et de conversion d entreprise integre a l annuaire.
          </DialogDescription>
          {content}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EntityOnboardingDialog;
