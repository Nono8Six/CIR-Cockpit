import { useCallback, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';

import { isApplePlatform } from '@/app/appConstants';
import { cn } from '@/lib/utils';
import { Button } from '../../ui/inputs/basic/Button';
import { Kbd } from '../../ui/data-display/Kbd';
import type { CockpitGuidedStep, useCockpitGuidedFlow } from '../../../hooks/cockpit/useCockpitGuidedFlow';
import type { CockpitFormLeftPaneProps, CockpitFormRightPaneProps } from '../CockpitPaneTypes';
import type { CockpitLeftEntitySectionsProps } from '../CockpitLeftEntitySectionsProps';
import CockpitContactSection from '../left/CockpitContactSection';
import CockpitGuidedChannelQuestion from './CockpitGuidedChannelQuestion';
import CockpitInternalLookup from './CockpitInternalLookup';
import CockpitGuidedRelationQuestion from './CockpitGuidedRelationQuestion';
import CockpitGuidedQuestionFrame from './CockpitGuidedQuestionFrame';
import CockpitGuidedSearchQuestion from './CockpitGuidedSearchQuestion';
import CockpitGuidedDetailsQuestion, { buildDescriptionOnlySubject } from './CockpitGuidedDetailsQuestion';
import CockpitSupplierContactStep from './CockpitSupplierContactStep';

type CockpitGuidedFlowState = ReturnType<typeof useCockpitGuidedFlow>;

type CockpitGuidedStepSwitchProps = {
  flow: CockpitGuidedFlowState;
  leftPaneProps: CockpitFormLeftPaneProps;
  rightPaneProps: CockpitFormRightPaneProps;
  entityProps: CockpitLeftEntitySectionsProps;
  onReset: () => void;
  focusFirstInvalidField?: () => void;
};

const CockpitGuidedStepSwitch = ({
  flow,
  leftPaneProps,
  rightPaneProps,
  entityProps,
  onReset,
  focusFirstInvalidField
}: CockpitGuidedStepSwitchProps) => {
  const continueShortcutLabel = `${isApplePlatform() ? '⌘' : 'Ctrl'} Entrée`;
  const isSolicitationRelation = leftPaneProps.relationMode === 'solicitation';
  const isInternalRelation = leftPaneProps.relationMode === 'internal';
  const isSupplierRelation = leftPaneProps.relationMode === 'supplier';
  const isDescriptionOnlyRelation = isSolicitationRelation || isInternalRelation || isSupplierRelation;
  const completeSubjectStep = useCallback(() => {
    if (isDescriptionOnlyRelation) {
      leftPaneProps.setValue('subject', buildDescriptionOnlySubject(
        rightPaneProps.notes,
        leftPaneProps.interactionType,
        isInternalRelation
          ? 'Relation interne CIR'
          : isSupplierRelation
            ? 'Interaction fournisseur'
            : 'Démarchage téléphonique'
      ), {
        shouldDirty: true,
        shouldValidate: true
      });
    }
    flow.completeStep('subject');
  }, [flow, isDescriptionOnlyRelation, isInternalRelation, isSupplierRelation, leftPaneProps, rightPaneProps.notes]);

  // Une erreur repond a une action: tant que l'utilisateur n'a pas tente de quitter
  // l'etape, rien n'est affiche. La tentative revele les erreurs et donne le focus
  // au premier champ fautif.
  const requestStepCompletion = useCallback((
    step: CockpitGuidedStep,
    isStepComplete: boolean,
    completeStep: () => void
  ) => {
    if (isStepComplete) {
      completeStep();
      return;
    }
    flow.revealStepErrors(step);
    focusFirstInvalidField?.();
  }, [flow, focusFirstInvalidField]);

  const requestContactCompletion = useCallback(() => {
    requestStepCompletion('contact', flow.contactComplete, () => flow.completeStep('contact'));
  }, [flow, requestStepCompletion]);

  const requestSubjectCompletion = useCallback(() => {
    requestStepCompletion('subject', isDescriptionOnlyRelation || flow.subjectComplete, completeSubjectStep);
  }, [completeSubjectStep, flow.subjectComplete, isDescriptionOnlyRelation, requestStepCompletion]);

  useEffect(() => {
    if (flow.activeStep !== 'contact' && flow.activeStep !== 'subject') return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey || event.key !== 'Enter') return;
      event.preventDefault();
      event.stopPropagation();
      if (flow.activeStep === 'subject') {
        requestSubjectCompletion();
        return;
      }
      requestContactCompletion();
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [flow.activeStep, requestContactCompletion, requestSubjectCompletion]);

  if (flow.activeStep === 'channel') {
    return (
      <CockpitGuidedQuestionFrame title="Par quel canal avez-vous échangé ?">
        <CockpitGuidedChannelQuestion {...leftPaneProps} onComplete={() => flow.completeStep('channel')} />
      </CockpitGuidedQuestionFrame>
    );
  }
  if (flow.activeStep === 'relation') {
    return (
      <CockpitGuidedQuestionFrame title="Quelle relation avec ce tiers ?">
        <CockpitGuidedRelationQuestion {...leftPaneProps} onComplete={() => flow.completeStep('relation')} />
      </CockpitGuidedQuestionFrame>
    );
  }
  if (flow.activeStep === 'search') {
    return (
      <CockpitGuidedSearchQuestion
        leftPaneProps={leftPaneProps}
        entityProps={entityProps}
        onComplete={() => flow.completeStep('search')}
        onRequestComplete={() => requestStepCompletion('search', flow.identityComplete, () => flow.completeStep('search'))}
        isIdentityComplete={flow.identityComplete}
      />
    );
  }
  if (flow.activeStep === 'contact') {
    return (
      <CockpitGuidedQuestionFrame
        title={isInternalRelation ? 'Contact interne' : isSupplierRelation ? 'Contact fournisseur' : 'Avec qui avez-vous échangé ?'}
        description={isInternalRelation
          ? 'Membre CIR existant ou contact ponctuel.'
          : isSupplierRelation
            ? 'Contact existant, ajout rapide, ou passage sans contact.'
          : 'Choisissez un contact existant du tiers, ou ajoutez-en un nouveau.'}
        density={isInternalRelation ? 'compact' : isSupplierRelation ? 'compact' : 'comfortable'}
        actions={isSupplierRelation ? null : (
          <Button
            type="button"
            size="sm"
            variant={flow.contactComplete ? 'default' : 'secondary'}
            onClick={requestContactCompletion}
            className={cn('gap-1.5', flow.contactComplete ? 'shadow-sm' : 'text-muted-foreground')}
          >
            Continuer
            {flow.contactComplete ? (
              <Kbd className="ml-1 border-primary-foreground/30 bg-primary-foreground/15 text-primary-foreground">
                {continueShortcutLabel}
              </Kbd>
            ) : null}
            <ArrowRight size={14} aria-hidden="true" />
          </Button>
        )}
      >
        {isInternalRelation ? (
          <CockpitInternalLookup
            activeAgencyId={leftPaneProps.activeAgencyId}
            agencies={leftPaneProps.agencies}
            setValue={leftPaneProps.setValue}
            onComplete={() => flow.completeStep('contact')}
          />
        ) : isSupplierRelation ? (
          <CockpitSupplierContactStep
            selectedEntity={leftPaneProps.selectedEntity}
            selectedContact={leftPaneProps.selectedContact}
            selectedContactMeta={leftPaneProps.selectedContactMeta}
            contacts={leftPaneProps.contacts}
            contactsLoading={leftPaneProps.contactsLoading}
            onSelectContactFromSearch={leftPaneProps.onSelectContactFromSearch}
            onClearSelectedContact={leftPaneProps.onClearSelectedContact}
            contactFirstNameField={leftPaneProps.contactFirstNameField}
            contactLastNameField={leftPaneProps.contactLastNameField}
            contactPositionField={leftPaneProps.contactPositionField}
            contactPhoneField={leftPaneProps.contactPhoneField}
            contactEmailField={leftPaneProps.contactEmailField}
            contactFirstName={leftPaneProps.contactFirstName}
            contactLastName={leftPaneProps.contactLastName}
            contactPosition={leftPaneProps.contactPosition}
            contactPhone={leftPaneProps.contactPhone}
            contactEmail={leftPaneProps.contactEmail}
            onContactPhoneChange={leftPaneProps.onContactPhoneChange}
            onComplete={() => flow.completeStep('contact')}
            continueShortcutLabel={continueShortcutLabel}
          />
        ) : (
          <CockpitContactSection {...entityProps.contact} />
        )}
      </CockpitGuidedQuestionFrame>
    );
  }
  if (flow.activeStep === 'subject') {
    return (
      <CockpitGuidedDetailsQuestion
        leftPaneProps={leftPaneProps}
        rightPaneProps={rightPaneProps}
        onReset={onReset}
        onComplete={requestSubjectCompletion}
        canComplete={isDescriptionOnlyRelation || flow.subjectComplete}
        showValidationErrors={flow.areStepErrorsVisible}
        onEditContact={() => flow.editStep('contact')}
        continueShortcutLabel={continueShortcutLabel}
      />
    );
  }
  return (
    <CockpitGuidedDetailsQuestion
      leftPaneProps={leftPaneProps}
      rightPaneProps={rightPaneProps}
      onReset={onReset}
      onEditContact={() => flow.editStep('contact')}
    />
  );
};

export default CockpitGuidedStepSwitch;
