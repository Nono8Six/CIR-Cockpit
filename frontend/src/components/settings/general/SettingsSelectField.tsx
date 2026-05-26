import { ArrowDownLeft, Info } from 'lucide-react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/inputs/selects/Select';

type SettingsSelectFieldProps = {
  label: string;
  description: string;
  value: string;
  onValueChange: (value: string) => void;
  disabled: boolean;
  items: Array<{ value: string; label: string }>;
  parentValueLabel?: string;
};

const SettingsSelectField = ({
  label,
  description,
  value,
  onValueChange,
  disabled,
  items,
  parentValueLabel,
}: SettingsSelectFieldProps) => {
  const isInherited = value === 'inherit';

  return (
    <div className="space-y-2 rounded-lg border border-border/40 bg-card p-4 transition-all hover:border-border">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground/80">
            {description}
          </p>
        </div>

        {parentValueLabel ? (
          <div className="flex shrink-0 items-center">
            {isInherited ? (
              <span className="inline-flex items-center gap-1 rounded border border-dashed border-border bg-muted/60 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                <ArrowDownLeft className="size-3" aria-hidden="true" />
                Hérité : {parentValueLabel}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                Surcharge active
              </span>
            )}
          </div>
        ) : null}
      </div>

      <div className="relative mt-2 flex items-center gap-2">
        {isInherited && parentValueLabel ? (
          <div
            className="absolute -top-3 left-4 h-3 w-0 border-l border-dashed border-border"
            aria-hidden="true"
          />
        ) : null}
        <Select value={value} onValueChange={onValueChange} disabled={disabled}>
          <SelectTrigger density="dense" className="w-full bg-background font-medium">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {items.map((item) => (
              <SelectItem key={item.value} value={item.value} className="text-xs">
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isInherited && parentValueLabel ? (
        <div className="flex items-center gap-1.5 pt-1 text-[11px] text-muted-foreground/70">
          <Info className="size-3" aria-hidden="true" />
          <span>Utilise le comportement global par défaut du produit</span>
        </div>
      ) : null}
    </div>
  );
};

export default SettingsSelectField;
