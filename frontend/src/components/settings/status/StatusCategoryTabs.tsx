import { Button } from '@/components/ui/button';
import type { StatusCategory } from '@/types';
import { STATUS_CATEGORY_LABELS, STATUS_CATEGORY_ORDER } from '@/constants/statusCategories';

type StatusCategoryTabsProps = {
  category: StatusCategory;
  readOnly: boolean;
  onCategoryChange: (value: StatusCategory) => void;
};

const StatusCategoryTabs = ({ category, readOnly, onCategoryChange }: StatusCategoryTabsProps) => {
  return (
    <div className="inline-flex max-w-full items-center gap-2 overflow-x-auto">
      {STATUS_CATEGORY_ORDER.map((item) => {
        const isActive = category === item;
        return (
          <Button
            key={item}
            type="button"
            size="sm"
            variant={isActive ? 'default' : 'outline'}
            onClick={() => onCategoryChange(item)}
            disabled={readOnly}
            aria-pressed={isActive}
            className={`whitespace-nowrap rounded-md px-3 text-xs font-semibold uppercase tracking-wide ${
              isActive
                ? 'bg-cir-red text-white hover:bg-red-700'
                : 'text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            {STATUS_CATEGORY_LABELS[item]}
          </Button>
        );
      })}
    </div>
  );
};

export default StatusCategoryTabs;
