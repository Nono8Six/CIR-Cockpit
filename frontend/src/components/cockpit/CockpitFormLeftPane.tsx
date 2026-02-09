import type { CockpitFormLeftPaneProps } from './CockpitPaneTypes';
import { buildCockpitLeftEntitySectionsProps } from './buildCockpitLeftEntitySectionsProps';
import CockpitChannelSection from './left/CockpitChannelSection';
import CockpitRelationSection from './left/CockpitRelationSection';
import CockpitInteractionTypeSection from './left/CockpitInteractionTypeSection';
import CockpitServiceSection from './left/CockpitServiceSection';
import CockpitSearchSection from './left/CockpitSearchSection';
import CockpitIdentitySection from './left/CockpitIdentitySection';
import CockpitContactSection from './left/CockpitContactSection';

const CockpitFormLeftPane = (props: CockpitFormLeftPaneProps) => {
  const entityProps = buildCockpitLeftEntitySectionsProps(props);

  return (
    <div data-testid="cockpit-left-pane" className="col-span-12 md:col-span-5 min-w-0 bg-white p-4 sm:p-5 flex flex-col gap-4 border-b border-slate-200 md:border-b-0 md:border-r">
      {/* Groupe Contexte */}
      <CockpitChannelSection
        labelStyle={props.labelStyle}
        errors={props.errors}
        setValue={props.setValue}
        channel={props.channel}
        channelButtonRef={props.channelButtonRef}
      />
      <CockpitRelationSection
        labelStyle={props.labelStyle}
        errors={props.errors}
        setValue={props.setValue}
        relationOptions={props.relationOptions}
        entityType={props.entityType}
        relationButtonRef={props.relationButtonRef}
      />
      <CockpitSearchSection {...entityProps.search} />
      <CockpitInteractionTypeSection
        labelStyle={props.labelStyle}
        errors={props.errors}
        interactionType={props.interactionType}
        hasInteractionTypes={props.hasInteractionTypes}
        interactionTypeHelpId={props.interactionTypeHelpId}
        interactionTypeRef={props.interactionTypeRef}
        interactionTypes={props.interactionTypes}
        setValue={props.setValue}
      />
      <CockpitServiceSection
        labelStyle={props.labelStyle}
        errors={props.errors}
        contactService={props.contactService}
        quickServices={props.quickServices}
        remainingServices={props.remainingServices}
        servicePickerOpen={props.servicePickerOpen}
        onServicePickerOpenChange={props.onServicePickerOpenChange}
        services={props.services}
        setValue={props.setValue}
      />
      <CockpitIdentitySection {...entityProps.identity} />
      <CockpitContactSection {...entityProps.contact} />
    </div>
  );
};

export default CockpitFormLeftPane;
