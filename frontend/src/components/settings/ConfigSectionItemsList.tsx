import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type ConfigSectionItemsListProps = {
  list: string[];
  onUpdate: (index: number, value: string) => void;
  onRemove: (index: number) => void;
  title: string;
  namePrefix: string;
  uppercase: boolean;
  readOnly: boolean;
};

const ConfigSectionItemsList = ({
  list,
  onUpdate,
  onRemove,
  title,
  namePrefix,
  uppercase,
  readOnly
}: ConfigSectionItemsListProps) => (
  <div className="flex-1 overflow-auto space-y-2 max-h-[300px] pr-2">
    {list.map((item, index) => (
      <div
        key={index}
        className="group flex flex-col gap-2 rounded-md border border-transparent bg-card px-2 py-2 transition-colors hover:border-border/70 sm:flex-row sm:items-center"
        data-testid={`${namePrefix}-row-${index}`}
      >
        <Input
          type="text"
          value={item}
          onChange={(event) => onUpdate(index, event.target.value)}
          className={`h-9 flex-1 border-border bg-card text-sm ${uppercase ? 'text-xs font-bold uppercase' : ''} ${readOnly ? 'text-muted-foreground/80' : ''}`}
          readOnly={readOnly}
          disabled={readOnly}
          name={`${namePrefix}-${index}`}
          aria-label={`${title} ${index + 1}`}
          autoComplete="off"
        />
        <Button
          type="button"
          onClick={() => onRemove(index)}
          variant="ghost"
          size="icon"
          className={`h-9 w-9 shrink-0 ${readOnly ? 'opacity-0' : 'text-muted-foreground/70 hover:text-primary sm:opacity-0 sm:group-hover:opacity-100'}`}
          disabled={readOnly}
          aria-disabled={readOnly}
          aria-label="Supprimer l'élément"
        >
          <Trash2 size={14} />
        </Button>
      </div>
    ))}
  </div>
);

export default ConfigSectionItemsList;
