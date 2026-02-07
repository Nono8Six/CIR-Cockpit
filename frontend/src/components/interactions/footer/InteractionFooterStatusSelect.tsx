import { ChevronDown } from 'lucide-react';

type InteractionFooterStatusSelectProps = {
  statusOptions: { id: string; label: string }[];
  statusId: string;
  onStatusChange: (value: string) => void;
};

const InteractionFooterStatusSelect = ({
  statusOptions,
  statusId,
  onStatusChange
}: InteractionFooterStatusSelectProps) => (
  <div className="col-span-4">
    <label htmlFor="interaction-status" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">
      Nouveau Statut
    </label>
    <div className="relative">
      <select
        id="interaction-status"
        value={statusId}
        onChange={(event) => onStatusChange(event.target.value)}
        className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-md py-2 pl-2 pr-6 focus:border-cir-red focus:outline-none appearance-none truncate"
        name="interaction-status"
      >
        {statusOptions.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown size={14} className="absolute right-2 top-2.5 text-slate-400 pointer-events-none" />
    </div>
  </div>
);

export default InteractionFooterStatusSelect;
