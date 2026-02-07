import type { AgencyStatus, Interaction } from '@/types';
import InteractionCard from '@/components/InteractionCard';

type KanbanColumnProps = {
  title: string;
  dotClassName: string;
  interactions: Interaction[];
  emptyLabel: string;
  onSelectInteraction: (interaction: Interaction) => void;
  getStatusMeta: (interaction: Interaction) => AgencyStatus | undefined;
};

const KanbanColumn = ({
  title,
  dotClassName,
  interactions,
  emptyLabel,
  onSelectInteraction,
  getStatusMeta
}: KanbanColumnProps) => {
  return (
    <div className="flex flex-col h-full bg-slate-100/50 rounded-lg border border-slate-200/60 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 flex justify-between items-center bg-white">
        <h3 className="font-bold text-slate-800 flex items-center gap-2 text-xs uppercase tracking-wider">
          <span className={`w-2 h-2 rounded-full ${dotClassName}`}></span> {title}
        </h3>
        <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-200">
          {interactions.length}
        </span>
      </div>
      <div className="p-3 overflow-y-auto flex-1 scrollbar-hide space-y-3">
        {interactions.map((interaction) => (
          <button
            key={interaction.id}
            type="button"
            onClick={() => onSelectInteraction(interaction)}
            className="w-full text-left bg-transparent border-none p-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cir-red/30 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50"
            aria-label={`Ouvrir ${interaction.company_name}`}
          >
            <InteractionCard data={interaction} statusMeta={getStatusMeta(interaction)} />
          </button>
        ))}
        {interactions.length === 0 && (
          <div className="text-center py-10 text-slate-400 text-sm">{emptyLabel}</div>
        )}
      </div>
    </div>
  );
};

export default KanbanColumn;
