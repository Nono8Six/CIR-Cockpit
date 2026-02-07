import type { UseFormSetValue } from 'react-hook-form';

import type { InteractionFormValues } from '@/schemas/interactionSchema';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

type CockpitServiceQuickTogglesProps = {
  quickServices: string[];
  contactService: string;
  setValue: UseFormSetValue<InteractionFormValues>;
};

const CockpitServiceQuickToggles = ({
  quickServices,
  contactService,
  setValue
}: CockpitServiceQuickTogglesProps) => (
  <ToggleGroup
    type="single"
    value={contactService}
    aria-label="Service"
    size="sm"
    variant="outline"
    spacing={2}
    onValueChange={(value) => {
      if (!value) return;
      setValue('contact_service', value, { shouldValidate: true, shouldDirty: true });
    }}
    className="flex flex-wrap justify-start"
  >
    {quickServices.map((service) => (
      <ToggleGroupItem
        key={service}
        value={service}
        className="flex items-center gap-1.5 px-2.5 h-8 rounded-md transition-colors text-[11px] font-semibold border bg-white text-slate-600 border-slate-200 hover:bg-cir-red/5 hover:border-cir-red/40 hover:text-slate-700 data-[state=on]:bg-cir-red data-[state=on]:text-white data-[state=on]:border-cir-red data-[state=on]:shadow-sm"
      >
        {service}
      </ToggleGroupItem>
    ))}
  </ToggleGroup>
);

export default CockpitServiceQuickToggles;
