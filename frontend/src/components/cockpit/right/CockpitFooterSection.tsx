import { RotateCcw } from 'lucide-react';
import type { UseFormRegisterReturn } from 'react-hook-form';

import type { AgencyConfig } from '@/services/config';
import type { AgencyStatus, StatusCategory } from '@/types';
import { Input } from '@/components/ui/input';
import CockpitStatusControl from './CockpitStatusControl';
import CockpitReminderControl from './CockpitReminderControl';

type CockpitFooterSectionProps = {
  footerLabelStyle: string;
  orderRefField: UseFormRegisterReturn;
  reminderField: UseFormRegisterReturn;
  reminderAt: string;
  statusMeta: AgencyStatus | null;
  statusCategoryLabel: string | null;
  statusCategoryBadges: Record<StatusCategory, string>;
  statusField: UseFormRegisterReturn;
  statusGroups: Record<StatusCategory, AgencyConfig['statuses']>;
  hasStatuses: boolean;
  statusHelpId: string;
  onSetReminder: (type: '1h' | 'tomorrow' | '3days' | 'nextWeek') => void;
  onReset: () => void;
};

const CockpitFooterSection = ({
  footerLabelStyle,
  orderRefField,
  reminderField,
  reminderAt,
  statusMeta,
  statusCategoryLabel,
  statusCategoryBadges,
  statusField,
  statusGroups,
  hasStatuses,
  statusHelpId,
  onSetReminder,
  onReset
}: CockpitFooterSectionProps) => {
  return (
    <div className="mt-auto pt-4 border-t border-slate-200 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-[auto_auto_1fr] gap-x-4 gap-y-2 items-center">
        <CockpitStatusControl
          footerLabelStyle={footerLabelStyle}
          statusMeta={statusMeta}
          statusCategoryLabel={statusCategoryLabel}
          statusCategoryBadges={statusCategoryBadges}
          statusField={statusField}
          statusGroups={statusGroups}
          hasStatuses={hasStatuses}
          statusHelpId={statusHelpId}
        />
        <div className="flex items-center gap-2">
          <label className={footerLabelStyle} htmlFor="interaction-order-ref">Ref. Dossier</label>
          <Input
            id="interaction-order-ref"
            type="text"
            {...orderRefField}
            maxLength={6}
            placeholder="N\u00B0 Devis\u2026"
            className="h-9 text-xs font-mono text-slate-700 w-[100px]"
            aria-label="Reference dossier"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <div className="flex items-center gap-2">
          <CockpitReminderControl
            footerLabelStyle={footerLabelStyle}
            reminderField={reminderField}
            reminderAt={reminderAt}
            onSetReminder={onSetReminder}
          />
          <button
            type="button"
            onClick={onReset}
            className="h-9 w-9 shrink-0 rounded-md border border-slate-200 text-slate-500 hover:bg-white hover:text-slate-800 transition shadow-sm bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cir-red/30"
            title="Effacer"
            aria-label="Effacer le formulaire"
          >
            <RotateCcw size={14} className="mx-auto" />
          </button>
        </div>
      </div>
      {!hasStatuses ? (
        <p id={statusHelpId} className="text-[11px] text-amber-600">
          Ajoutez des statuts dans Parametres.
        </p>
      ) : null}
    </div>
  );
};

export default CockpitFooterSection;
