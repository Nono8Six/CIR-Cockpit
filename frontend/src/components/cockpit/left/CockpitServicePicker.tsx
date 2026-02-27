import type { UseFormSetValue } from 'react-hook-form';

import type { InteractionFormValues } from '@/schemas/interactionSchema';
import { cn } from '@/lib/utils';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList
} from '@/components/ui/combobox';

type CockpitServicePickerProps = {
  servicePickerOpen: boolean;
  onServicePickerOpenChange: (open: boolean) => void;
  services: string[];
  remainingServices: string[];
  contactService: string;
  setValue: UseFormSetValue<InteractionFormValues>;
  triggerLabelledBy?: string;
  forceVisible?: boolean;
  fullWidth?: boolean;
};

const CockpitServicePicker = ({
  servicePickerOpen,
  onServicePickerOpenChange,
  services,
  remainingServices,
  contactService,
  setValue,
  triggerLabelledBy,
  forceVisible = false,
  fullWidth = false
}: CockpitServicePickerProps) => {
  if (!forceVisible && remainingServices.length === 0) return null;

  return (
    <Combobox
      items={services}
      value={contactService}
      open={servicePickerOpen}
      onOpenChange={onServicePickerOpenChange}
      onValueChange={(value) => {
        if (!value) return;
        setValue('contact_service', value, {
          shouldValidate: true,
          shouldDirty: true
        });
      }}
      className={cn(fullWidth ? 'w-full' : 'w-[220px]')}
    >
      <ComboboxInput
        id="cockpit-service-picker-input"
        aria-labelledby={triggerLabelledBy}
        data-testid="cockpit-service-picker-trigger"
        placeholder="Selectionner un service"
        searchPlaceholder="Rechercher un service..."
      />
      <ComboboxContent className={fullWidth ? 'w-[min(320px,calc(100vw-1.5rem))]' : ''}>
        <ComboboxEmpty>Aucun service trouve.</ComboboxEmpty>
        <ComboboxList>
          {(service) => (
            <ComboboxItem key={service} value={service}>
              {service}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
};

export default CockpitServicePicker;
