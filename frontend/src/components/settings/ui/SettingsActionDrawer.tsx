import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { RotateCcw, Save, AlertCircle } from 'lucide-react';
import { Button } from '../../ui/inputs/basic/Button';

type SettingsActionDrawerProps = {
  isDirty: boolean;
  isSaving: boolean;
  readOnly: boolean;
  onReset: () => void;
  onSave: () => Promise<void>;
};

/**
 * Sticky action drawer that slides up from the bottom of the screen
 * when the user makes any modifications to the settings form.
 */
const SettingsActionDrawer = ({
  isDirty,
  isSaving,
  readOnly,
  onReset,
  onSave,
}: SettingsActionDrawerProps) => {
  const showDrawer = isDirty && !readOnly;
  const shouldReduceMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {showDrawer && (
        <motion.div
          initial={shouldReduceMotion ? { opacity: 0 } : { y: 80, opacity: 0 }}
          animate={shouldReduceMotion ? { opacity: 1 } : { y: 0, opacity: 1 }}
          exit={shouldReduceMotion ? { opacity: 0 } : { y: 80, opacity: 0 }}
          transition={{ duration: shouldReduceMotion ? 0.12 : 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-4 left-1/2 z-30 w-[calc(100%-2rem)] max-w-3xl -translate-x-1/2 border border-primary/25 bg-background/95 p-3 shadow-xl backdrop-blur-md md:w-full"
          role="region"
          aria-label="Actions de modification"
          aria-live="polite"
        >
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-3 text-left">
              <div className="flex size-9 shrink-0 items-center justify-center border border-primary/20 bg-primary/10 text-primary">
                <AlertCircle className="size-5" aria-hidden="true" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground">
                  Modifications non enregistrées
                </h4>
                <p className="text-xs text-muted-foreground">
                  Vous avez modifié des paramètres. Enregistrez ou annulez les changements.
                </p>
              </div>
            </div>
            <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onReset}
                className="h-9 px-4 text-xs font-semibold uppercase tracking-wider transition-[background-color,color,border-color] hover:bg-muted"
                disabled={isSaving}
              >
                <RotateCcw size={14} className="mr-1.5" aria-hidden="true" /> Réinitialiser
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={onSave}
                className="h-9 bg-primary px-5 text-xs font-semibold uppercase tracking-wider text-primary-foreground shadow-sm transition-[background-color,color] hover:bg-primary/90"
                disabled={isSaving}
                data-testid="settings-save-button"
              >
                <Save size={14} className="mr-1.5" aria-hidden="true" />
                {isSaving ? 'Enregistrement…' : 'Enregistrer'}
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SettingsActionDrawer;
