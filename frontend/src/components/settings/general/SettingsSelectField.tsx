import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/inputs/selects/Select';
import { ArrowDownLeft, Info } from 'lucide-react';

type SettingsSelectFieldProps = {
  label: string;
  description: string;
  value: string;
  onValueChange: (value: string) => void;
  disabled: boolean;
  items: Array<{ value: string; label: string }>;
  parentValueLabel?: string;
};

/**
 * Custom select field illustrating visual inheritance when inheriting from product.
 */
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

        {/* Visual inheritance indicator badge */}
        {parentValueLabel && (
          <div className="flex items-center shrink-0">
            {isInherited ? (
              <span className="inline-flex items-center gap-1 rounded bg-muted/60 px-2 py-0.5 font-mono text-[10px] text-muted-foreground border border-dashed border-border">
                <ArrowDownLeft className="size-3" />
                Hérité : {parentValueLabel}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary border border-primary/20">
                Surcharge active
              </span>
            )}
          </div>
        )}
      </div>

      <div className="relative mt-2 flex items-center gap-2">
        {/* Dotted indicator line for active visual inheritance */}
        {isInherited && parentValueLabel && (
          <div
            className="absolute -top-3 left-4 h-3 w-0 border-l border-dashed border-border"
            aria-hidden="true"
          />
        )}
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

      {isInherited && parentValueLabel && (
        <div className="flex items-center gap-1.5 pt-1 text-[11px] text-muted-foreground/70">
          <Info className="size-3" />
          <span>Utilise le comportement global par défaut du produit</span>
        </div>
      )}
    </div>
  );
};

export default SettingsSelectField;
