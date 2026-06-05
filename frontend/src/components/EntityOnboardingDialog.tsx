import { useState } from "react";
import { ArrowLeft, LoaderCircle, ShieldCheck, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import type {
  DirectoryCommercialOption,
  DirectoryListRow,
} from '../../../shared/schemas/system/directory.schema';
import type { ClientPayload } from "@/services/clients/saveClient";
import type { EntityPayload } from "@/services/entities/saveEntity";
import type { Agency, UserRole } from "@/types";
import { cn } from "@/lib/utils";
import { Badge } from './ui/data-display/Badge';
import { Button } from './ui/inputs/basic/Button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/feedback/AlertDialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from './ui/feedback/Sheet';
import EntityOnboardingDetailsStep from "@/components/entity-onboarding/EntityOnboardingDetailsStep";
import EntityOnboardingIntentStep from "@/components/entity-onboarding/EntityOnboardingIntentStep";
import EntityOnboardingReviewStep from "@/components/entity-onboarding/EntityOnboardingReviewStep";
import EntityOnboardingSearchStep from "@/components/entity-onboarding/EntityOnboardingSearchStep";
import EntityOnboardingSidebar from "@/components/entity-onboarding/EntityOnboardingSidebar";
import { EntityRecordWizardProgress } from "@/components/entity-record-wizard/EntityRecordWizardProgress";
import {
  EntityRecordWizardHeader,
  EntityRecordWizardShell,
  EntityRecordWizardWorkspace,
} from "@/components/entity-record-wizard/EntityRecordWizardShell";
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
  defaultClientKind?: "company" | "individual";
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
  defaultClientKind = "company",
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
  const [showAside, setShowAside] = useState(true);
  const flow = useEntityOnboardingFlow({
    open,
    onOpenChange,
    userRole,
    activeAgencyId,
    mode,
    defaultIntent,
    defaultClientKind,
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
        ? "Créer le client"
        : "Créer le prospect"
    : "Continuer";
  const footerMessage =
    stepError ??
    (stepper.flow.is("company")
      ? "Sélection et doublons visibles avant création."
      : stepper.flow.is("details")
        ? "Champs obligatoires vérifiés en ligne."
        : stepper.flow.is("review")
          ? "Résumé final exactement conforme aux données sauvegardées."
          : "Le type choisi ajuste tout le reste du parcours.");
  const stepMotionProps = reducedMotion
    ? {}
    : {
        initial: { opacity: 0, x: 8 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -8 },
        transition: { duration: 0.15 },
      };

  const headerLeading = (
    <>
          {showHeaderBack ? (
            <Button
              type="button"
              variant="ghost"
              size="dense"
              className="shrink-0 px-2 text-muted-foreground hover:bg-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
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
              className="gap-1.5 border-border bg-surface-2 text-foreground font-medium"
            >
              {mode === "convert" ? "Conversion" : "Nouveau"}
            </Badge>
            <Badge
              variant="outline"
              density="dense"
              className="border-border bg-surface-2 text-foreground font-medium"
            >
              {sourceLabel}
            </Badge>
            {values.official_data_source ? (
              <Badge
                variant="outline"
                density="dense"
                className="border-success/20 bg-success/5 text-success font-medium"
              >
                <Sparkles className="mr-1 size-3" aria-hidden="true" />
                Officiel
              </Badge>
            ) : null}
          </div>
    </>
  );

  const headerProgress = (
    <EntityRecordWizardProgress
      label="Progression du parcours"
      steps={renderedSteps}
      currentIndex={currentStepIndex}
      onCompletedStepClick={goToCompletedStep}
    />
  );

  const headerActions = (
    <div className="flex flex-wrap items-center justify-end gap-2" role="group" aria-label="Actions du parcours">
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
          {surface === "dialog" && (
            <Button
              type="button"
              variant="ghost"
              size="dense"
              onClick={() => setShowAside(!showAside)}
              className={cn(
                "text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 gap-1.5",
                showAside && "text-primary hover:text-primary bg-surface-2"
              )}
              aria-label={showAside ? "Masquer les informations" : "Afficher les informations"}
            >
              <ShieldCheck className="size-4" />
              <span className="hidden sm:inline">Info</span>
              {duplicateMatches.length > 0 && (
                <span className="ml-1 flex size-1.5 rounded-full bg-warning animate-pulse" />
              )}
            </Button>
          )}
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
  );

  const main = (
            <AnimatePresence mode="wait" initial={false}>
              {stepper.flow.is("intent") ? (
                <motion.div
                  key="step-intent"
                  className="mx-auto max-w-2xl"
                  {...stepMotionProps}
                >
                  <div className="mb-6 border-b border-border-subtle pb-4">
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
                  className="mx-auto max-w-4xl"
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
                    postalCode={flow.postalCodeFilter}
                    onPostalCodeChange={flow.setPostalCodeFilter}
                    city={flow.cityFilter}
                    onCityChange={flow.setCityFilter}
                    nafCode={flow.nafCodeFilter}
                    onNafCodeChange={flow.setNafCodeFilter}
                    activitySection={flow.activitySectionFilter}
                    onActivitySectionChange={flow.setActivitySectionFilter}
                    headOffice={flow.headOfficeFilter}
                    onHeadOfficeChange={flow.setHeadOfficeFilter}
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
                  className="mx-auto max-w-4xl"
                  {...stepMotionProps}
                >
                  <div className="mb-6 border-b border-border-subtle pb-4">
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
                  className="mx-auto max-w-4xl"
                  {...stepMotionProps}
                >
                  <div className="mb-6 border-b border-border-subtle pb-4">
                    <h2 className="text-xl font-semibold tracking-tight text-foreground">
                      Confirmation finale
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Vérifie les informations avant l&apos;insertion dans la base de
                      données.
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
  );

  const aside = (
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
  );

  const content = (
    <EntityRecordWizardShell className={surface === "page" ? "flex-1" : "border-0"}>
      <EntityRecordWizardHeader
        leading={headerLeading}
        progress={headerProgress}
        actions={headerActions}
      />
      <EntityRecordWizardWorkspace
        main={main}
        aside={aside}
        isSheet={surface === "dialog"}
        showAside={showAside}
      />
    </EntityRecordWizardShell>
  );

  const closeConfirmDialog = (
    <AlertDialog open={isCloseConfirmOpen} onOpenChange={setIsCloseConfirmOpen}>
      <AlertDialogContent className="border-border">
        <AlertDialogHeader>
          <AlertDialogTitle>Quitter le parcours ?</AlertDialogTitle>
          <AlertDialogDescription>
            Les modifications non enregistrées seront perdues si tu fermes
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

      <Sheet open={open} onOpenChange={handleDialogOpenChange}>
        <SheetContent
          showCloseButton={false}
          side="right"
          overlayClassName="bg-foreground/25 backdrop-blur-[6px]"
          className="h-full w-[min(96vw,1240px)] sm:max-w-none sm:max-w-[1240px] overflow-hidden border-l border-border bg-background p-0 shadow-2xl"
        >
          <SheetTitle className="sr-only">{title}</SheetTitle>
          <SheetDescription className="sr-only">
            Flux de création et de conversion d&apos;entreprise intégré à l&apos;annuaire.
          </SheetDescription>
          {content}
        </SheetContent>
      </Sheet>
    </>
  );
};

export default EntityOnboardingDialog;
