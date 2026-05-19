import { useCallback, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';

import { isApplePlatform } from '@/app/appConstants';
import { Button } from '../../ui/inputs/basic/Button';
import { Kbd } from '../../ui/data-display/Kbd';
import type { useCockpitGuidedFlow } from '../../../hooks/cockpit/useCockpitGuidedFlow';
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
};

const CockpitGuidedStepSwitch = ({
  flow,
  leftPaneProps,
  rightPaneProps,
  entityProps,
  onReset
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

  useEffect(() => {
    const canCompleteWithShortcut =
      (flow.activeStep === 'contact' && flow.contactComplete)
      || (flow.activeStep === 'subject' && (flow.subjectComplete || isDescriptionOnlyRelation));
    if (!canCompleteWithShortcut) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey || event.key !== 'Enter') return;
      event.preventDefault();
      event.stopPropagation();
      if (flow.activeStep === 'subject') {
        completeSubjectStep();
        return;
      }
      flow.completeStep(flow.activeStep);
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [completeSubjectStep, flow, isDescriptionOnlyRelation]);

  if (flow.activeStep === 'channel') {
    return (
      <CockpitGuidedQuestionFrame eyebrow="Canal">
        <CockpitGuidedChannelQuestion {...leftPaneProps} onComplete={() => flow.completeStep('channel')} />
      </CockpitGuidedQuestionFrame>
    );
  }
  if (flow.activeStep === 'relation') {
    return (
      <CockpitGuidedQuestionFrame eyebrow="Relation">
        <CockpitGuidedRelationQuestion {...leftPaneProps} onComplete={() => flow.completeStep('relation')} />
      </CockpitGuidedQuestionFrame>
    );
  }
  if (flow.activeStep === 'search') {
    return (
      <CockpitGuidedSearchQuestion
        leftPaneProps={leftPaneProps}
        entityProps={entityProps}
        identityComplete={flow.identityComplete}
        onComplete={() => flow.completeStep('search')}
      />
    );
  }
  if (flow.activeStep === 'contact') {
    return (
      <CockpitGuidedQuestionFrame
        eyebrow="Contact"
        title={isInternalRelation ? 'Contact interne' : isSupplierRelation ? 'Contact fournisseur' : 'Avec qui as-tu échangé ?'}
        description={isInternalRelation
          ? 'Membre CIR existant ou contact ponctuel.'
          : isSupplierRelation
            ? 'Contact existant, ajout rapide, ou passage sans contact.'
          : 'Choisis un contact existant du tiers, ou ajoute-en un nouveau.'}
        density={isInternalRelation ? 'compact' : isSupplierRelation ? 'compact' : 'comfortable'}
        actions={isSupplierRelation ? null : (
          <Button
            type="button"
            size="sm"
            onClick={() => flow.completeStep('contact')}
            disabled={!flow.contactComplete}
            className="gap-1.5 shadow-sm"
          >
            Continuer
            <Kbd className={flow.contactComplete
              ? 'ml-1 border-primary-foreground/30 bg-primary-foreground/15 text-primary-foreground'
              : 'ml-1 border-muted-foreground/20 bg-muted text-muted-foreground'}
            >
                {continueShortcutLabel}
            </Kbd>
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
        onComplete={completeSubjectStep}
        canComplete={isDescriptionOnlyRelation || flow.subjectComplete}
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
