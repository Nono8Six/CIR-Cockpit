import { Trash2 } from 'lucide-react';

import type { AgencyStatus, StatusCategory } from '@/types';
import { STATUS_CATEGORY_LABELS } from '@/constants/statusCategories';
import { isStatusCategory } from '@/utils/typeGuards';

type StatusRowProps = { status: AgencyStatus; index: number; readOnly: boolean; onRemove: (index: number) => void; onLabelUpdate: (index: number, value: string) => void; onCategoryUpdate: (index: number, value: StatusCategory) => void };

const StatusRow = ({ status, index, readOnly, onRemove, onLabelUpdate, onCategoryUpdate }: StatusRowProps) => {
  return (
    <div className="flex items-center gap-2 group bg-white border border-transparent hover:border-slate-100 rounded-md px-1 py-1 transition-colors">
      <input type="text" value={status.label} onChange={(event) => onLabelUpdate(index, event.target.value)} className={`flex-1 bg-transparent border-b border-transparent focus:border-slate-300 focus:outline-none text-sm text-slate-700 px-2 py-1 ${readOnly ? 'text-slate-400' : ''}`} readOnly={readOnly} disabled={readOnly} name={`status-label-${index}`} aria-label={`Statut ${index + 1}`} autoComplete="off" />
      <select value={status.category} onChange={(event) => { if (isStatusCategory(event.target.value)) onCategoryUpdate(index, event.target.value); }} className={`border border-slate-200 rounded-md px-2 py-1 text-[10px] font-bold uppercase bg-white text-slate-600 ${readOnly ? 'bg-slate-50 text-slate-400' : ''}`} disabled={readOnly} name={`status-category-${index}`} aria-label={`Categorie du statut ${index + 1}`}>
        {Object.entries(STATUS_CATEGORY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      {index === 0 && <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">Defaut</span>}
      <button type="button" onClick={() => onRemove(index)} className={`transition-colors p-2 ${readOnly ? 'opacity-0' : 'text-slate-200 hover:text-red-500 opacity-0 group-hover:opacity-100'}`} disabled={readOnly} aria-disabled={readOnly} aria-label="Supprimer le statut"><Trash2 size={14} /></button>
    </div>
  );
};

export default StatusRow;
