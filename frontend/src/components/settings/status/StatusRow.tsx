import { Trash2 } from 'lucide-react';

import type { AgencyStatus, StatusCategory } from '@/types';
import { STATUS_CATEGORY_LABELS } from '@/constants/statusCategories';
import { isStatusCategory } from '@/utils/typeGuards';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

type StatusRowProps = { status: AgencyStatus; index: number; readOnly: boolean; onRemove: (index: number) => void; onLabelUpdate: (index: number, value: string) => void; onCategoryUpdate: (index: number, value: StatusCategory) => void };

const StatusRow = ({ status, index, readOnly, onRemove, onLabelUpdate, onCategoryUpdate }: StatusRowProps) => {
  return (
    <div
      className="group flex flex-col gap-2 rounded-md border border-transparent bg-white px-2 py-2 transition-colors hover:border-slate-100 sm:flex-row sm:items-center"
      data-testid={`settings-status-row-${index}`}
    >
      <Input
        type="text"
        value={status.label}
        onChange={(event) => onLabelUpdate(index, event.target.value)}
        className={`h-9 flex-1 border-slate-200 bg-white text-sm ${readOnly ? 'text-slate-400' : ''}`}
        readOnly={readOnly}
        disabled={readOnly}
        name={`status-label-${index}`}
        aria-label={`Statut ${index + 1}`}
        autoComplete="off"
      />
      <Select
        value={status.category}
        onValueChange={(value) => {
          if (isStatusCategory(value)) onCategoryUpdate(index, value);
        }}
        disabled={readOnly}
      >
        <SelectTrigger
          className={`h-9 w-full border-slate-200 text-xs font-bold uppercase sm:w-[190px] ${readOnly ? 'bg-slate-50 text-slate-400' : ''}`}
          aria-label={`Categorie du statut ${index + 1}`}
          data-testid={`settings-status-row-category-${index}`}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(STATUS_CATEGORY_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value} className="text-xs font-semibold uppercase">
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {index === 0 && <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">Defaut</span>}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => onRemove(index)}
        className={`h-9 w-9 shrink-0 ${readOnly ? 'opacity-0' : 'text-slate-300 hover:text-red-600 sm:opacity-0 sm:group-hover:opacity-100'}`}
        disabled={readOnly}
        aria-disabled={readOnly}
        aria-label="Supprimer le statut"
      >
        <Trash2 size={14} />
      </Button>
    </div>
  );
};

export default StatusRow;
