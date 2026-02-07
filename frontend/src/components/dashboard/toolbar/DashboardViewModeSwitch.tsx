import { Columns, LayoutList } from 'lucide-react';

type ViewMode = 'kanban' | 'list';

type DashboardViewModeSwitchProps = {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
};

const DashboardViewModeSwitch = ({ viewMode, onViewModeChange }: DashboardViewModeSwitchProps) => {
  return (
    <div className="flex bg-slate-100 rounded-md p-1 gap-1 shrink-0">
      <button
        type="button"
        onClick={() => onViewModeChange('kanban')}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-sm text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cir-red/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
          viewMode === 'kanban'
            ? 'bg-white text-cir-red shadow-sm ring-1 ring-cir-red/20'
            : 'text-slate-600 hover:text-cir-red hover:bg-cir-red/5'
        }`}
      >
        <Columns size={14} /> TABLEAU
      </button>
      <button
        type="button"
        onClick={() => onViewModeChange('list')}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-sm text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cir-red/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
          viewMode === 'list'
            ? 'bg-white text-cir-red shadow-sm ring-1 ring-cir-red/20'
            : 'text-slate-600 hover:text-cir-red hover:bg-cir-red/5'
        }`}
      >
        <LayoutList size={14} /> HISTORIQUE
      </button>
    </div>
  );
};

export default DashboardViewModeSwitch;
