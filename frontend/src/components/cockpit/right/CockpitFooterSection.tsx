import { RotateCcw } from 'lucide-react';
import type { UseFormRegisterReturn } from 'react-hook-form';
import type { RefObject } from 'react';

import type { AgencyConfig } from '@/services/config';
import type { AgencyStatus, StatusCategory } from '@/types';
import { Input } from '../../ui/inputs/basic/Input';
import CockpitStatusControl from './CockpitStatusControl';

type CockpitFooterSectionProps = {
  footerLabelStyle: string;
  orderRefField: UseFormRegisterReturn;
  statusMeta: AgencyStatus | null;
  statusCategoryLabel: string | null;
  statusCategoryBadges: Record<StatusCategory, string>;
  statusTriggerRef: RefObject<HTMLButtonElement | null>;
  statusValue: string;
  onStatusChange: (statusId: string) => void;
  statusGroups: Record<StatusCategory, AgencyConfig['statuses']>;
  hasStatuses: boolean;
  statusHelpId: string;
  onReset: () => void;
};

const CockpitFooterSection = ({
  footerLabelStyle,
  orderRefField,
  statusMeta,
  statusCategoryLabel,
  statusCategoryBadges,
  statusTriggerRef,
  statusValue,
  onStatusChange,
  statusGroups,
  hasStatuses,
  statusHelpId,
  onReset
}: CockpitFooterSectionProps) => {
  return (
    <div data-testid="cockpit-footer-card" className="mt-2 rounded-xl border border-border bg-card p-3 sm:p-4 space-y-3">
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_auto]">
        <div className="space-y-3">
          <CockpitStatusControl
            footerLabelStyle={footerLabelStyle}
            statusMeta={statusMeta}
            statusCategoryLabel={statusCategoryLabel}
            statusCategoryBadges={statusCategoryBadges}
            statusTriggerRef={statusTriggerRef}
            statusValue={statusValue}
            onStatusChange={onStatusChange}
            statusGroups={statusGroups}
            hasStatuses={hasStatuses}
            statusHelpId={statusHelpId}
          />
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <label className={footerLabelStyle} htmlFor="interaction-order-ref">Ref. Dossier</label>
            <Input
              id="interaction-order-ref"
              type="text"
              {...orderRefField}
              maxLength={6}
              placeholder="N° Devis…"
              className="h-9 w-full sm:w-[130px] text-xs font-mono text-foreground"
              aria-label="Référence dossier"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        </div>
        <div className="flex min-w-0 items-start justify-end gap-2">
          <button
            type="button"
            onClick={onReset}
            className="h-9 w-9 shrink-0 rounded-md border border-border bg-card text-muted-foreground shadow-sm transition hover:bg-surface-1 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            title="Effacer"
            aria-label="Effacer le formulaire"
          >
            <RotateCcw size={14} className="mx-auto" />
          </button>
        </div>
      </div>
      {!hasStatuses ? (
        <p id={statusHelpId} className="text-xs text-warning-strong">
          Ajoutez des statuts dans Paramètres.
        </p>
      ) : null}
    </div>
  );
};

export default CockpitFooterSection;
