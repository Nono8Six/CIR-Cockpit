import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type CockpitGuidedQuestionFrameProps = {
  title?: string;
  eyebrow: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
  density?: 'comfortable' | 'compact';
};

const CockpitGuidedQuestionFrame = ({
  title,
  eyebrow,
  description,
  children,
  actions,
  density = 'comfortable'
}: CockpitGuidedQuestionFrameProps) => (
  <section className={cn(density === 'compact' ? 'space-y-3' : 'space-y-5')}>
    <div className={cn(density === 'compact' ? 'space-y-1' : 'space-y-1.5')}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {eyebrow}
      </p>
      {title ? (
        <h2 className={cn(
          'font-semibold leading-snug tracking-tight text-foreground text-pretty',
          density === 'compact' ? 'text-[17px]' : 'text-[20px]'
        )}>
          {title}
        </h2>
      ) : null}
      {description ? (
        <p className={cn(
          'max-w-prose leading-relaxed text-muted-foreground',
          density === 'compact' ? 'text-xs' : 'text-sm'
        )}>
          {description}
        </p>
      ) : null}
    </div>
    <div className={cn(density === 'compact' ? 'space-y-3' : 'space-y-4')}>
      {children}
      {actions ? (
        <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
          {actions}
        </div>
      ) : null}
    </div>
  </section>
);

export default CockpitGuidedQuestionFrame;
