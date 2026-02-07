import type { RefObject } from 'react';
import type { FieldErrors, UseFormSetValue } from 'react-hook-form';
import { Car, Mail, Phone, Store } from 'lucide-react';

import { Channel } from '@/types';
import type { InteractionFormValues } from '@/schemas/interactionSchema';

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
  <div className="space-y-1">
    <div className="flex items-center justify-between gap-3">
      <label className={`${labelStyle} mb-0`}>Canal</label>
      <div className="flex items-center gap-2">
        {CHANNEL_OPTIONS.map((opt, index) => (
          <button
            key={opt.val}
            type="button"
            ref={index === 0 ? channelButtonRef : undefined}
            onClick={() => setValue('channel', opt.val, { shouldValidate: true, shouldDirty: true })}
            className={`flex items-center gap-1.5 px-2.5 h-8 rounded-md transition-colors text-[11px] font-semibold border ${
              channel === opt.val
                ? 'bg-cir-red text-white border-cir-red shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-cir-red/5 hover:border-cir-red/40 hover:text-slate-700'
            }`}
          >
            <opt.icon size={14} />
            {opt.val}
          </button>
        ))}
      </div>
    </div>
    {errors.channel && (
      <p className="text-[11px] text-red-600 mt-1" role="status" aria-live="polite">
        {errors.channel.message}
      </p>
    )}
  </div>
);

export default CockpitChannelSection;
