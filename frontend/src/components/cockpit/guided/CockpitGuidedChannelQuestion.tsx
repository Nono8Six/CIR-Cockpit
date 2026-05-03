import type { RefObject } from 'react';
import type { FieldErrors, UseFormSetValue } from 'react-hook-form';
import { Car, Mail, Phone, Store, type LucideIcon } from 'lucide-react';

import { Channel } from '@/types';
import { Kbd } from '@/components/ui/kbd';
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
  description: string;
};

const CHANNEL_OPTIONS: ChannelOption[] = [
  { value: Channel.PHONE, icon: Phone, shortcut: 'T', description: 'Appel entrant ou sortant' },
  { value: Channel.EMAIL, icon: Mail, shortcut: 'E', description: 'Message reçu ou envoyé' },
  { value: Channel.COUNTER, icon: Store, shortcut: 'C', description: 'Échange au comptoir' },
  { value: Channel.VISIT, icon: Car, shortcut: 'V', description: 'Rendez-vous ou passage terrain' }
];

const CockpitGuidedChannelQuestion = ({
  channel,
  errors,
  setValue,
  channelButtonRef,
  onComplete
}: CockpitGuidedChannelQuestionProps) => (
  <div className="grid auto-rows-fr gap-3 sm:grid-cols-2 xl:grid-cols-4" data-testid="cockpit-guided-channel">
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
            'group grid h-full min-h-[88px] grid-cols-[36px_minmax(0,1fr)_auto] items-start gap-3 rounded-md border bg-card px-3.5 py-3 text-left transition-[border-color,box-shadow,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.99]',
            isSelected
              ? 'border-primary/55 shadow-[inset_3px_0_0_0_hsl(var(--primary))]'
              : 'border-border hover:border-foreground/20 hover:shadow-soft'
          )}
          aria-pressed={isSelected}
        >
          <span
            className={cn(
              'mt-0.5 grid size-9 place-items-center rounded-md border border-border bg-surface-2 transition-colors',
              isSelected ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'
            )}
          >
            <Icon size={16} aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold leading-tight text-foreground">
              {option.value}
            </span>
            <span className="mt-1 block text-[12px] leading-[1.45] text-muted-foreground">
              {option.description}
            </span>
          </span>
          <Kbd className="mt-0.5 h-6 min-w-6 px-2 text-[11px]">
            {option.shortcut}
          </Kbd>
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
