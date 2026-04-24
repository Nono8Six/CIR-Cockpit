import type { CockpitFormLeftPaneProps } from '../CockpitPaneTypes';
import type { CockpitLeftEntitySectionsProps } from '../CockpitLeftEntitySectionsProps';
import { Button } from '@/components/ui/button';
import CockpitSearchSection from '../left/CockpitSearchSection';
import CockpitIdentitySection from '../left/CockpitIdentitySection';
import CockpitGuidedQuestionFrame from './CockpitGuidedQuestionFrame';
import CockpitInternalLookup from './CockpitInternalLookup';
import CockpitSolicitationLookup from './CockpitSolicitationLookup';

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
        <CockpitInternalLookup
          activeAgencyId={leftPaneProps.activeAgencyId}
          setValue={leftPaneProps.setValue}
          onComplete={onComplete}
        />
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
      eyebrow="Etape 3"
      title="Rechercher le tiers ou saisir les premiers elements"
      actions={<Button type="button" size="sm" onClick={onComplete} disabled={!identityComplete}>Continuer</Button>}
    >
      {renderLookup()}
    </CockpitGuidedQuestionFrame>
  );
};

export default CockpitGuidedSearchQuestion;
