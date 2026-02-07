import type { Entity } from '@/types';
import { formatClientNumber } from '@/utils/clients/formatClientNumber';

type InteractionSearchRecentsProps = {
  recents: Entity[];
  onSelectEntity: (entity: Entity) => void;
};

const InteractionSearchRecents = ({ recents, onSelectEntity }: InteractionSearchRecentsProps) => (
  <div className="px-3 py-2 border-b border-slate-100 bg-white">
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 shrink-0">
        Recents
      </span>
      <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap">
        {recents.map((entity) => (
          <button
            key={entity.id}
            type="button"
            onClick={() => onSelectEntity(entity)}
            className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 hover:border-cir-red/40 hover:text-slate-900"
          >
            <span className="truncate max-w-[140px]">{entity.name}</span>
            <span className="text-[10px] font-mono text-slate-400">
              {formatClientNumber(entity.client_number)}
            </span>
          </button>
        ))}
      </div>
    </div>
  </div>
);

export default InteractionSearchRecents;
