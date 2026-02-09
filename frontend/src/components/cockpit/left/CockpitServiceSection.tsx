import { useEffect, useRef, useState } from 'react';
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

const MOBILE_SERVICE_QUERY = '(max-width: 768px)';

const hasMultipleRows = (group: HTMLElement): boolean => {
  const firstItem = group.querySelector<HTMLElement>('[data-state]');
  if (!firstItem) return false;

  const groupHeight = group.getBoundingClientRect().height;
  const itemHeight = firstItem.getBoundingClientRect().height;
  return groupHeight > itemHeight + 2;
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
}: CockpitServiceSectionProps) => {
  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !('matchMedia' in window)) return false;
    return window.matchMedia(MOBILE_SERVICE_QUERY).matches;
  });
  const [isQuickServicesWrapped, setIsQuickServicesWrapped] = useState(false);
  const quickServicesWrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('matchMedia' in window)) return undefined;

    const mediaQuery = window.matchMedia(MOBILE_SERVICE_QUERY);
    const onChange = (event: MediaQueryListEvent) => setIsMobileViewport(event.matches);

    setIsMobileViewport(mediaQuery.matches);
    mediaQuery.addEventListener('change', onChange);
    return () => mediaQuery.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (!quickServices.length) {
      setIsQuickServicesWrapped(false);
      return undefined;
    }

    const container = quickServicesWrapRef.current;
    if (!container) return undefined;

    const evaluateWrap = () => {
      const group = container.querySelector<HTMLElement>('[data-testid="cockpit-service-quick-group"]');
      if (!group) {
        setIsQuickServicesWrapped(false);
        return;
      }

      setIsQuickServicesWrapped(hasMultipleRows(group));
    };

    evaluateWrap();

    const resizeObserver = new ResizeObserver(() => {
      evaluateWrap();
    });
    resizeObserver.observe(container);

    const group = container.querySelector<HTMLElement>('[data-testid="cockpit-service-quick-group"]');
    if (group) {
      resizeObserver.observe(group);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [quickServices]);

  const shouldUseComboboxOnly = isMobileViewport || isQuickServicesWrapped || quickServices.length === 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label className={labelStyle}>Service</label>
        {!shouldUseComboboxOnly ? (
          <CockpitServicePicker
            servicePickerOpen={servicePickerOpen}
            onServicePickerOpenChange={onServicePickerOpenChange}
            services={services}
            remainingServices={remainingServices}
            contactService={contactService}
            setValue={setValue}
          />
        ) : null}
      </div>
      {shouldUseComboboxOnly ? (
        <CockpitServicePicker
          servicePickerOpen={servicePickerOpen}
          onServicePickerOpenChange={onServicePickerOpenChange}
          services={services}
          remainingServices={remainingServices}
          contactService={contactService}
          setValue={setValue}
          forceVisible
          fullWidth
        />
      ) : (
        <div ref={quickServicesWrapRef}>
          <CockpitServiceQuickToggles
            quickServices={quickServices}
            contactService={contactService}
            setValue={setValue}
          />
        </div>
      )}
      <CockpitFieldError message={errors.contact_service?.message} />
    </div>
  );
};

export default CockpitServiceSection;
