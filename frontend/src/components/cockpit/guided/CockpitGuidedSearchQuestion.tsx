import type { CockpitFormLeftPaneProps } from '../CockpitPaneTypes';
import type { CockpitLeftEntitySectionsProps } from '../CockpitLeftEntitySectionsProps';
import { Button } from '../../ui/inputs/basic/Button';
import CockpitSearchSection from '../left/CockpitSearchSection';
import CockpitIdentitySection from '../left/CockpitIdentitySection';
import CockpitGuidedQuestionFrame from './CockpitGuidedQuestionFrame';
import CockpitSolicitationLookup from './CockpitSolicitationLookup';
import CockpitSupplierLookup from './CockpitSupplierLookup';

type CockpitGuidedSearchQuestionProps = {
  leftPaneProps: CockpitFormLeftPaneProps;
  entityProps: CockpitLeftEntitySectionsProps;
  identityComplete: boolean;
  onComplete: () => void;
};

const CockpitGuidedSearchQuestion = ({
  leftPaneProps,
  entityProps,
  identityComplete,
  onComplete
}: CockpitGuidedSearchQuestionProps) => {
  const renderLookup = () => {
    if (leftPaneProps.relationMode === 'internal') {
      return (
        <p className="text-sm text-muted-foreground">
          Tiers interne CIR sélectionné. La personne se choisit à l&apos;étape Contact.
        </p>
      );
    }
    if (leftPaneProps.relationMode === 'solicitation') {
      return (
        <CockpitSolicitationLookup
          activeAgencyId={leftPaneProps.activeAgencyId}
          errors={leftPaneProps.errors}
          companyField={leftPaneProps.companyField}
          companyName={leftPaneProps.companyName}
          showSuggestions={leftPaneProps.showSuggestions}
          onShowSuggestionsChange={leftPaneProps.onShowSuggestionsChange}
          companySuggestions={leftPaneProps.companySuggestions}
          companyInputRef={leftPaneProps.companyInputRef}
          contactPhoneField={leftPaneProps.contactPhoneField}
          contactPhone={leftPaneProps.contactPhone}
          onContactPhoneChange={leftPaneProps.onContactPhoneChange}
          setValue={leftPaneProps.setValue}
          interactions={leftPaneProps.interactions}
          onComplete={onComplete}
        />
      );
    }
    if (leftPaneProps.relationMode === 'supplier') {
      return (
        <CockpitSupplierLookup
          activeAgencyId={leftPaneProps.activeAgencyId}
          selectedEntity={leftPaneProps.selectedEntity}
          companyName={leftPaneProps.companyName}
          onSelectUnifiedSearchResult={leftPaneProps.onSelectUnifiedSearchResult}
          onClearSelectedEntity={leftPaneProps.onClearSelectedEntity}
          setValue={leftPaneProps.setValue}
          onComplete={onComplete}
        />
      );
    }
    return (
      <div className="space-y-4">
        <CockpitSearchSection {...entityProps.search} />
        <CockpitIdentitySection {...entityProps.identity} />
      </div>
    );
  };

  return (
    <CockpitGuidedQuestionFrame
      eyebrow="Étape 3"
      title="Rechercher ou créer le tiers"
      actions={leftPaneProps.relationMode === 'solicitation' || leftPaneProps.relationMode === 'supplier'
        ? null
        : <Button type="button" size="sm" onClick={onComplete} disabled={!identityComplete}>Continuer</Button>}
    >
      {renderLookup()}
    </CockpitGuidedQuestionFrame>
  );
};

export default CockpitGuidedSearchQuestion;
