import { AnimatePresence, motion } from 'motion/react';
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

  return (
    <AnimatePresence>
      {showDrawer && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed bottom-6 left-1/2 z-50 w-[90%] max-w-2xl -translate-x-1/2 rounded-xl border border-primary/20 bg-background/95 p-4 shadow-xl backdrop-blur-md md:w-full"
          role="region"
          aria-label="Actions de modification"
        >
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-3 text-left">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <AlertCircle className="size-5" />
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
                className="h-9 px-4 text-xs font-semibold uppercase tracking-wider transition-all hover:bg-muted"
                disabled={isSaving}
              >
                <RotateCcw size={14} className="mr-1.5" /> Réinitialiser
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={onSave}
                className="h-9 px-5 bg-primary text-primary-foreground text-xs font-semibold uppercase tracking-wider shadow-sm transition-all hover:bg-primary/90"
                disabled={isSaving}
                data-testid="settings-save-button"
              >
                <Save size={14} className="mr-1.5" />
                {isSaving ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SettingsActionDrawer;
