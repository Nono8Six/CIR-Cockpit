import type { Interaction } from '@/types';
import { formatDate } from '@/utils/date/formatDate';

type AppSearchInteractionsSectionProps = {
  interactions: Interaction[];
};

const AppSearchInteractionsSection = ({ interactions }: AppSearchInteractionsSectionProps) => {
  if (interactions.length === 0) return null;

  return (
    <div className="space-y-1">
      <div className="px-2 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
        Interactions
      </div>
      {interactions.map((interaction) => (
        <div
          key={interaction.id}
          className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer group transition-colors"
        >
          <div className="flex flex-col gap-0.5">
            <span className="font-medium text-slate-900 text-sm group-hover:text-cir-red transition-colors">
              {interaction.company_name}
            </span>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="truncate max-w-[200px]">{interaction.subject}</span>
              <span>•</span>
              <span>{interaction.contact_name}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-xs text-slate-400">{formatDate(interaction.created_at)}</span>
            {interaction.order_ref && (
              <span className="text-xs bg-slate-100 px-1.5 rounded text-slate-600 font-mono">
                #{interaction.order_ref}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default AppSearchInteractionsSection;
