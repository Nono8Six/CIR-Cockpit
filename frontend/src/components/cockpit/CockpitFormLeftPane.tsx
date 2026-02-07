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
    <div className="col-span-12 md:col-span-5 bg-white border-r border-slate-200 p-5 flex flex-col gap-4 overflow-y-auto">
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

      {/* Separator */}
      <div className="border-t border-slate-100 pt-3" aria-hidden="true" />

      {/* Groupe Entite */}
      <CockpitSearchSection {...entityProps.search} />
      <CockpitIdentitySection {...entityProps.identity} />
      <CockpitContactSection {...entityProps.contact} />
    </div>
  );
};

export default CockpitFormLeftPane;
