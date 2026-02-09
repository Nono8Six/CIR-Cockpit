import type { UseFormSetValue } from 'react-hook-form';

import type { InteractionFormValues } from '@/schemas/interactionSchema';
import { cn } from '@/lib/utils';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

type CockpitServiceQuickTogglesProps = {
  quickServices: string[];
  contactService: string;
  setValue: UseFormSetValue<InteractionFormValues>;
  className?: string;
};

const CockpitServiceQuickToggles = ({
  quickServices,
  contactService,
  setValue,
  className
}: CockpitServiceQuickTogglesProps) => (
  <ToggleGroup
    type="single"
    value={contactService}
    aria-label="Service"
    data-testid="cockpit-service-quick-group"
    size="sm"
    variant="outline"
    spacing={2}
    onValueChange={(value) => {
      if (!value) return;
      setValue('contact_service', value, { shouldValidate: true, shouldDirty: true });
    }}
    className={cn('flex flex-wrap items-center justify-start gap-2', className)}
  >
    {quickServices.map((service) => (
      <ToggleGroupItem
        key={service}
        value={service}
        className="h-7 gap-1.5 rounded-md border px-2 text-xs font-normal data-[state=on]:border-cir-red data-[state=on]:bg-cir-red data-[state=on]:text-white"
      >
        {service}
      </ToggleGroupItem>
    ))}
  </ToggleGroup>
);

export default CockpitServiceQuickToggles;
