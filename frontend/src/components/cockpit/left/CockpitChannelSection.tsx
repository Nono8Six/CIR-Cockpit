import type { RefObject } from 'react';
import type { FieldErrors, UseFormSetValue } from 'react-hook-form';
import { Car, Mail, Phone, Store, type LucideIcon } from 'lucide-react';

import { Channel } from '@/types';
import type { InteractionFormValues } from 'shared/schemas/interaction.schema';
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

type ChannelOption = {
  val: Channel;
  icon: LucideIcon;
  letter: string;
};

const CHANNEL_OPTIONS: ChannelOption[] = [
  { val: Channel.PHONE, icon: Phone, letter: 'T' },
  { val: Channel.EMAIL, icon: Mail, letter: 'E' },
  { val: Channel.COUNTER, icon: Store, letter: 'C' },
  { val: Channel.VISIT, icon: Car, letter: 'V' }
];

const CockpitChannelSection = ({
  labelStyle,
  errors,
  setValue,
  channel,
  channelButtonRef
}: CockpitChannelSectionProps) => (
  <div className="space-y-1.5">
    <p id="cockpit-channel-label" className={`${labelStyle} mb-0`}>Canal</p>
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
          aria-labelledby="cockpit-channel-label"
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
      aria-labelledby="cockpit-channel-label"
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
          aria-label={`Canal ${opt.val}, raccourci ${opt.letter}`}
          className="h-7 gap-1.5 rounded-md border px-2 text-xs font-normal data-[state=on]:border-ring data-[state=on]:bg-primary data-[state=on]:text-white"
        >
          <opt.icon size={12} className="shrink-0" aria-hidden="true" />
          <span>{opt.val}</span>
          <kbd
            aria-hidden="true"
            className="ml-0.5 rounded border border-border/70 bg-muted/70 px-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground group-data-[state=on]:border-white/40 group-data-[state=on]:bg-white/15 group-data-[state=on]:text-white"
          >
            {opt.letter}
          </kbd>
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
