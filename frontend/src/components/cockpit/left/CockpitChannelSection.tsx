import type { RefObject } from 'react';
import type { FieldErrors, UseFormSetValue } from 'react-hook-form';
import { Car, Mail, Phone, Store } from 'lucide-react';

import { Channel } from '@/types';
import type { InteractionFormValues } from '@/schemas/interactionSchema';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList
} from '@/components/ui/combobox';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

type CockpitChannelSectionProps = {
  labelStyle: string;
  errors: FieldErrors<InteractionFormValues>;
  setValue: UseFormSetValue<InteractionFormValues>;
  channel: Channel;
  channelButtonRef: RefObject<HTMLButtonElement | null>;
};

const CHANNEL_OPTIONS = [
  { val: Channel.PHONE, icon: Phone },
  { val: Channel.EMAIL, icon: Mail },
  { val: Channel.COUNTER, icon: Store },
  { val: Channel.VISIT, icon: Car }
];

const CockpitChannelSection = ({
  labelStyle,
  errors,
  setValue,
  channel,
  channelButtonRef
}: CockpitChannelSectionProps) => (
  <div className="space-y-2">
    <label className={`${labelStyle} mb-0`}>Canal</label>
    <div className="min-[769px]:hidden">
      <Combobox
        items={CHANNEL_OPTIONS.map((option) => option.val)}
        value={channel}
        onValueChange={(value) => {
          if (!value) return;
          setValue('channel', value as Channel, { shouldValidate: true, shouldDirty: true });
        }}
      >
        <ComboboxInput
          data-testid="cockpit-channel-picker-trigger"
          placeholder="Selectionner un canal"
          searchPlaceholder="Rechercher un canal..."
        />
        <ComboboxContent>
          <ComboboxEmpty>Aucun canal trouve.</ComboboxEmpty>
          <ComboboxList>
            {(item) => (
              <ComboboxItem key={item} value={item}>
                {item}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
    <ToggleGroup
      type="single"
      value={channel}
      aria-label="Canal"
      data-testid="cockpit-channel-group"
      size="sm"
      variant="outline"
      spacing={2}
      onValueChange={(value) => {
        if (!value) return;
        setValue('channel', value as Channel, { shouldValidate: true, shouldDirty: true });
      }}
      className="hidden flex-wrap items-center justify-start min-[769px]:flex"
    >
      {CHANNEL_OPTIONS.map((opt, index) => (
        <ToggleGroupItem
          key={opt.val}
          ref={index === 0 ? channelButtonRef : undefined}
          value={opt.val}
          className="h-7 gap-1.5 rounded-md border px-2 text-xs font-normal data-[state=on]:border-ring data-[state=on]:bg-primary data-[state=on]:text-white"
        >
          <opt.icon size={12} className="shrink-0" aria-hidden="true" />
          {opt.val}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
    {errors.channel && (
      <p className="text-xs text-destructive mt-1" role="status" aria-live="polite">
        {errors.channel.message}
      </p>
    )}
  </div>
);

export default CockpitChannelSection;
