import type { FieldErrors, UseFormSetValue } from 'react-hook-form';

import type { InteractionFormValues } from '@/schemas/interactionSchema';
import CockpitFieldError from './CockpitFieldError';
import CockpitServicePicker from './CockpitServicePicker';
import CockpitServiceQuickToggles from './CockpitServiceQuickToggles';

type CockpitServiceSectionProps = {
  labelStyle: string;
  errors: FieldErrors<InteractionFormValues>;
  contactService: string;
  quickServices: string[];
  remainingServices: string[];
  servicePickerOpen: boolean;
  onServicePickerOpenChange: (open: boolean) => void;
  services: string[];
  setValue: UseFormSetValue<InteractionFormValues>;
};

const CockpitServiceSection = ({
  labelStyle,
  errors,
  contactService,
  quickServices,
  remainingServices,
  servicePickerOpen,
  onServicePickerOpenChange,
  services,
  setValue
}: CockpitServiceSectionProps) => (
  <div>
    <div className="flex items-center justify-between gap-3">
      <label className={labelStyle}>Service</label>
      <CockpitServicePicker
        servicePickerOpen={servicePickerOpen}
        onServicePickerOpenChange={onServicePickerOpenChange}
        services={services}
        remainingServices={remainingServices}
        contactService={contactService}
        setValue={setValue}
      />
    </div>
    <CockpitServiceQuickToggles
      quickServices={quickServices}
      contactService={contactService}
      setValue={setValue}
    />
    <CockpitFieldError message={errors.contact_service?.message} />
  </div>
);

export default CockpitServiceSection;
