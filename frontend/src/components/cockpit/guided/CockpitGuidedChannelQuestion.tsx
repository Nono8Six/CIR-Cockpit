import type { RefObject } from 'react';
import type { FieldErrors, UseFormSetValue } from 'react-hook-form';
import { Car, Mail, Phone, Store, type LucideIcon } from 'lucide-react';

import { Channel } from '@/types';
import { cn } from '@/lib/utils';
import type { InteractionFormValues } from 'shared/schemas/interaction.schema';

type CockpitGuidedChannelQuestionProps = {
  channel: Channel;
  errors: FieldErrors<InteractionFormValues>;
  setValue: UseFormSetValue<InteractionFormValues>;
  channelButtonRef: RefObject<HTMLButtonElement | null>;
  onComplete: () => void;
};

type ChannelOption = {
  value: Channel;
  icon: LucideIcon;
  shortcut: string;
};

const CHANNEL_OPTIONS: ChannelOption[] = [
  { value: Channel.PHONE, icon: Phone, shortcut: 'T' },
  { value: Channel.EMAIL, icon: Mail, shortcut: 'E' },
  { value: Channel.COUNTER, icon: Store, shortcut: 'C' },
  { value: Channel.VISIT, icon: Car, shortcut: 'V' }
];

const CockpitGuidedChannelQuestion = ({
  channel,
  errors,
  setValue,
  channelButtonRef,
  onComplete
}: CockpitGuidedChannelQuestionProps) => (
  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4" data-testid="cockpit-guided-channel">
    {CHANNEL_OPTIONS.map((option, index) => {
      const Icon = option.icon;
      const isSelected = option.value === channel;
      return (
        <button
          key={option.value}
          ref={index === 0 ? channelButtonRef : undefined}
          type="button"
          onClick={() => {
            setValue('channel', option.value, { shouldValidate: true, shouldDirty: true });
            onComplete();
          }}
          className={cn(
            'flex min-h-[76px] items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left transition-colors',
            isSelected
              ? 'border-ring/50 bg-primary text-primary-foreground shadow-sm'
              : 'border-border bg-card hover:border-ring/35 hover:bg-surface-1'
          )}
          aria-pressed={isSelected}
        >
          <span className="flex min-w-0 items-center gap-3">
            <Icon size={18} className="shrink-0" aria-hidden="true" />
            <span className="text-sm font-semibold">{option.value}</span>
          </span>
          <kbd className={cn(
            'rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide',
            isSelected ? 'border-white/30 bg-white/15 text-white' : 'border-border bg-surface-1 text-muted-foreground'
          )}>
            {option.shortcut}
          </kbd>
        </button>
      );
    })}
    {errors.channel ? (
      <p className="sm:col-span-2 xl:col-span-4 text-xs text-destructive" role="status" aria-live="polite">
        {errors.channel.message}
      </p>
    ) : null}
  </div>
);

export default CockpitGuidedChannelQuestion;
