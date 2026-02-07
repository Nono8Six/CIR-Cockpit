import { ChevronDown } from 'lucide-react';
import type { UseFormSetValue } from 'react-hook-form';

import type { InteractionFormValues } from '@/schemas/interactionSchema';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';

type CockpitServicePickerProps = {
  servicePickerOpen: boolean;
  onServicePickerOpenChange: (open: boolean) => void;
  services: string[];
  remainingServices: string[];
  contactService: string;
  setValue: UseFormSetValue<InteractionFormValues>;
};

const CockpitServicePicker = ({
  servicePickerOpen,
  onServicePickerOpenChange,
  services,
  remainingServices,
  contactService,
  setValue
}: CockpitServicePickerProps) => {
  if (remainingServices.length === 0) return null;

  return (
    <Popover open={servicePickerOpen} onOpenChange={onServicePickerOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-2.5 text-xs gap-1.5"
        >
          Tous les services
          <Badge variant="secondary" className="text-xs font-semibold">
            {services.length}
          </Badge>
          <ChevronDown size={12} className="text-slate-400" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[320px] p-0">
        <Command>
          <CommandInput placeholder="Rechercher un service..." />
          <ScrollArea className="h-[240px]">
            <CommandList>
              <CommandEmpty>Aucun service trouve.</CommandEmpty>
              <CommandGroup heading="Services">
                {services.map((service) => (
                  <CommandItem
                    key={service}
                    value={service}
                    onSelect={(value) => {
                      if (!value) return;
                      setValue('contact_service', value, {
                        shouldValidate: true,
                        shouldDirty: true
                      });
                      onServicePickerOpenChange(false);
                    }}
                  >
                    <span className="flex-1">{service}</span>
                    {contactService === service && (
                      <Badge variant="secondary" className="text-xs font-semibold">
                        Actuel
                      </Badge>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </ScrollArea>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default CockpitServicePicker;
