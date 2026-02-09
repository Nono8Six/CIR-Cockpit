import { Archive } from 'lucide-react';

import { Entity } from '@/types';

interface ProspectListProps {
  prospects: Entity[];
  selectedProspectId: string | null;
  onSelect: (prospectId: string) => void;
}

const ProspectList = ({ prospects, selectedProspectId, onSelect }: ProspectListProps) => {
  if (prospects.length === 0) {
    return (
      <div className="text-sm text-slate-400 border border-dashed border-slate-200 rounded-lg p-4">
        Aucun prospect trouve.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {prospects.map(prospect => {
        const isSelected = selectedProspectId === prospect.id;
        return (
          <button
            key={prospect.id}
            type="button"
            onClick={() => onSelect(prospect.id)}
            className={`w-full text-left p-3 rounded-md border transition ${
              isSelected ? 'border-cir-red bg-cir-red/5' : 'border-slate-200 hover:border-cir-red/40'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs text-slate-400 uppercase tracking-widest">
                  {prospect.entity_type || 'Prospect'}
                </p>
                <p className="text-sm font-semibold text-slate-900 truncate">{prospect.name}</p>
                <p className="text-xs text-slate-500 truncate">{prospect.city || 'Sans ville'}</p>
              </div>
              {prospect.archived_at && (
                <span className="flex items-center gap-1 text-xs uppercase text-amber-600">
                  <Archive size={12} /> Archive
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default ProspectList;
