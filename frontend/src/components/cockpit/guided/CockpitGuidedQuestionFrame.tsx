import type { ReactNode } from 'react';

type CockpitGuidedQuestionFrameProps = {
  title?: string;
  eyebrow: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
};

const CockpitGuidedQuestionFrame = ({
  title,
  eyebrow,
  description,
  children,
  actions
}: CockpitGuidedQuestionFrameProps) => (
  <section className="space-y-5">
    <div className="space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {eyebrow}
      </p>
      {title ? (
        <h2 className="text-[20px] font-semibold leading-snug tracking-tight text-foreground">
          {title}
        </h2>
      ) : null}
      {description ? (
        <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
    </div>
    <div className="space-y-4">
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
