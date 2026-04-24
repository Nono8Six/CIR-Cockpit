import type { ReactNode } from 'react';

type CockpitGuidedQuestionFrameProps = {
  title: string;
  eyebrow: string;
  children: ReactNode;
  actions?: ReactNode;
};

const CockpitGuidedQuestionFrame = ({
  title,
  eyebrow,
  children,
  actions
}: CockpitGuidedQuestionFrameProps) => (
  <section className="rounded-lg border border-border bg-card shadow-sm">
    <div className="border-b border-border px-4 py-3 sm:px-5">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        {eyebrow}
      </p>
      <h2 className="mt-1 text-lg font-semibold text-foreground">
        {title}
      </h2>
    </div>
    <div className="space-y-4 px-4 py-4 sm:px-5">
      {children}
      {actions ? (
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
          {actions}
        </div>
      ) : null}
    </div>
  </section>
);

export default CockpitGuidedQuestionFrame;
