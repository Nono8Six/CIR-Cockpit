import { ChevronRight } from 'lucide-react';

import { formatDate } from '@/utils/date/formatDate';
import { formatTime } from '@/utils/date/formatTime';
import DashboardFamilyBadges from './DashboardFamilyBadges';
import type { DashboardListRowProps } from './DashboardListRow.types';

const DashboardListRow = ({
  item,
  getChannelIcon,
  getStatusBadgeClass,
  onSelectInteraction
}: DashboardListRowProps) => {
  return (
    <tr className="hover:bg-slate-50 transition-colors">
      <td className="px-6 py-3 text-sm font-medium text-slate-500">
        <div className="flex flex-col">
          <span>{formatDate(item.created_at)}</span>
          <span className="text-xs text-slate-400">{formatTime(item.created_at)}</span>
        </div>
      </td>
      <td className="px-6 py-3 text-center">
        <div className="flex justify-center items-center">{getChannelIcon(item.channel)}</div>
      </td>
      <td className="px-6 py-3">
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase whitespace-nowrap border ${getStatusBadgeClass(item)}`}>
          {item.status}
        </span>
      </td>
      <td className="px-6 py-3">
        <div className="flex flex-col">
          <span className="font-semibold text-slate-900 text-sm truncate max-w-[200px]" title={item.company_name}>
            {item.company_name}
          </span>
          <span className="text-xs text-slate-500">
            {item.contact_name}
            {(item.contact_phone || item.contact_email) && ` • ${item.contact_phone ?? item.contact_email}`}
          </span>
        </div>
      </td>
      <td className="px-6 py-3">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-slate-700 font-medium truncate max-w-[300px]">{item.subject}</span>
          <DashboardFamilyBadges families={item.mega_families} />
        </div>
      </td>
      <td className="px-6 py-3 text-right">
        {item.order_ref && (
          <div className="flex justify-end">
            <span className="flex items-center gap-1 text-xs font-mono text-slate-600 bg-slate-100 px-2 py-1 rounded border border-slate-200">
              #{item.order_ref}
            </span>
          </div>
        )}
      </td>
      <td className="px-6 py-3 text-right">
        <button
          type="button"
          onClick={() => onSelectInteraction(item)}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-cir-red hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cir-red/30"
          aria-label={`Ouvrir ${item.company_name}`}
        >
          Ouvrir <ChevronRight size={12} />
        </button>
      </td>
    </tr>
  );
};

export default DashboardListRow;
