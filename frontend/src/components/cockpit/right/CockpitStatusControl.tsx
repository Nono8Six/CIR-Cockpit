import { ChevronDown } from 'lucide-react';
import type { UseFormRegisterReturn } from 'react-hook-form';

import type { AgencyConfig } from '@/services/config';
import type { AgencyStatus, StatusCategory } from '@/types';
import { STATUS_CATEGORY_LABELS, STATUS_CATEGORY_ORDER } from '@/constants/statusCategories';

type CockpitStatusControlProps = {
  footerLabelStyle: string;
  statusMeta: AgencyStatus | null;
  statusCategoryLabel: string | null;
  statusCategoryBadges: Record<StatusCategory, string>;
  statusField: UseFormRegisterReturn;
  statusGroups: Record<StatusCategory, AgencyConfig['statuses']>;
  hasStatuses: boolean;
  statusHelpId: string;
};

const CockpitStatusControl = ({
  footerLabelStyle,
  statusMeta,
  statusCategoryLabel,
  statusCategoryBadges,
  statusField,
  statusGroups,
  hasStatuses,
  statusHelpId
}: CockpitStatusControlProps) => {
  return (
    <div className="flex items-center gap-2">
      <label className={footerLabelStyle} htmlFor="interaction-status">Statut</label>
      {statusMeta && statusCategoryLabel ? (
        <span className={`text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border ${statusCategoryBadges[statusMeta.category]}`}>
          {statusCategoryLabel}
        </span>
      ) : null}
      <div className="relative">
        <select
          id="interaction-status"
          {...statusField}
          className="appearance-none pl-2.5 pr-7 py-1.5 rounded-md text-xs font-semibold border focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer transition-shadow shadow-sm h-9 bg-white border-input text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!hasStatuses}
          aria-describedby={hasStatuses ? undefined : statusHelpId}
        >
          {STATUS_CATEGORY_ORDER.map((category) => {
            const items = statusGroups[category];
            if (items.length === 0) return null;
            return (
              <optgroup key={category} label={STATUS_CATEGORY_LABELS[category]}>
                {items.map((statusItem) => (
                  <option key={statusItem.id ?? statusItem.label} value={statusItem.id ?? statusItem.label}>
                    {statusItem.label}
                  </option>
                ))}
              </optgroup>
            );
          })}
        </select>
        <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      </div>
    </div>
  );
};

export default CockpitStatusControl;
