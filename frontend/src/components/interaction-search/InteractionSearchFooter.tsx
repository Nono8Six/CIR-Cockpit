import { motion, useReducedMotion } from 'motion/react';

type InteractionSearchFooterProps = {
  createLabel?: string;
  createDisabled?: boolean;
  onCreateEntity?: () => void;
  onOpenGlobalSearch?: () => void;
};

const InteractionSearchFooter = ({
  createLabel,
  createDisabled = false,
  onCreateEntity,
  onOpenGlobalSearch
}: InteractionSearchFooterProps) => {
  const shouldReduceMotion = useReducedMotion();

  if (!createLabel && !onOpenGlobalSearch) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground select-none">
      {createLabel ? (
        <motion.button
          type="button"
          onClick={onCreateEntity}
          disabled={createDisabled || !onCreateEntity}
          whileHover={shouldReduceMotion ? {} : { scale: 1.015 }}
          whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
          className="inline-flex items-center gap-1.5 font-bold text-primary transition-all duration-200 hover:bg-primary/5 hover:border-primary/45 hover:text-primary/95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer px-4 py-2 rounded-full border border-primary/25 bg-primary/[0.03] shadow-sm text-xs font-semibold"
        >
          {createLabel}
        </motion.button>
      ) : (
        <span />
      )}
      {onOpenGlobalSearch && (
        <motion.button
          type="button"
          onClick={onOpenGlobalSearch}
          whileHover={shouldReduceMotion ? {} : { scale: 1.015 }}
          whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
          className="inline-flex items-center gap-1.5 font-semibold text-muted-foreground transition-all duration-200 hover:text-foreground hover:bg-surface-2 hover:border-border/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 cursor-pointer px-4 py-2 rounded-full border border-border/60 bg-surface-1 shadow-sm text-xs"
        >
          <span className="sm:hidden">Voir tout</span>
          <span className="hidden sm:inline-flex items-center gap-1.5">
            Voir tout
            <kbd className="rounded border border-border/80 bg-background px-1.5 py-0.5 font-mono text-[9px] font-bold text-muted-foreground/80 shadow-sm ml-0.5">
              Ctrl+K
            </kbd>
          </span>
        </motion.button>
      )}
    </div>
  );
};

export default InteractionSearchFooter;

