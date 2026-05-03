import { Save } from 'lucide-react';

import { getPlatformShortcutLabel } from '@/app/appConstants';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';
import type { CockpitGuidedStep } from '@/hooks/useCockpitGuidedFlow';

type ShortcutStep = CockpitGuidedStep | 'readonly';

type CockpitShortcutLegendProps = {
  activeStep: ShortcutStep;
  canSave?: boolean;
  formId?: string;
  gateMessage?: string | null;
  onFocusCurrentStep?: () => void;
};

const CockpitShortcutLegend = ({
  activeStep,
  canSave = false,
  formId,
  gateMessage = null,
  onFocusCurrentStep
}: CockpitShortcutLegendProps) => {
  const submitShortcut = getPlatformShortcutLabel('\u21b5');

  if (activeStep !== 'details' || !formId) {
    return null;
  }

  return (
    <div
      data-testid="cockpit-shortcut-legend"
      aria-label="Action de validation"
      className="shrink-0 border-t border-border bg-background/95 px-3 py-2.5 text-[11px] text-muted-foreground shadow-[0_-8px_24px_rgba(15,23,42,0.04)] backdrop-blur sm:px-5"
    >
      <div className="mx-auto flex max-w-[1180px] flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div data-testid="cockpit-shortcut-legend-actions" className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="rounded border border-border bg-surface-1 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground">
            Validation
          </span>
          <span className="inline-flex min-h-7 items-center gap-1.5 rounded-md border border-primary/25 bg-primary/5 px-2 text-[11px] font-medium text-foreground">
            <Kbd className="border-primary/25 bg-primary/10 text-primary">
              {submitShortcut}
            </Kbd>
            Enregistrer
          </span>
          <span className="inline-flex min-h-7 items-center gap-1.5 rounded-md border border-border bg-card px-2 text-[11px] font-medium text-muted-foreground">
            <Kbd>?</Kbd>
            Aide
          </span>
        </div>
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          {!canSave && gateMessage ? (
            <button
              type="button"
              onClick={onFocusCurrentStep}
              className="min-h-9 w-full truncate rounded-md border border-warning/35 bg-warning/15 px-2.5 text-xs font-semibold text-warning-foreground transition-colors hover:bg-warning/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:w-auto sm:max-w-[300px]"
            >
              {gateMessage}
            </button>
          ) : null}
          <Button
            data-testid="cockpit-submit-button"
            type="submit"
            form={formId}
            disabled={!canSave}
            className="min-h-9 w-full gap-1.5 px-3 text-xs sm:w-auto"
            title={canSave ? 'Prêt à enregistrer' : gateMessage ?? undefined}
          >
            <Save size={12} />
            Enregistrer
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CockpitShortcutLegend;
