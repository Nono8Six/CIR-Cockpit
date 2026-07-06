import type { ReactNode } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/inputs/selects/Select';

interface FormFieldProps {
  label: string;
  htmlFor: string;
  children: ReactNode;
}

/**
 * Standard Form Field wrapper with label for styling consistency.
 *
 * @param props Component properties including label, htmlFor, and child element.
 */
export const FormField = ({ label, htmlFor, children }: FormFieldProps) => (
  <div className="min-w-0 space-y-1.5">
    <label
      htmlFor={htmlFor}
      className="block text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/80"
    >
      {label}
    </label>
    {children}
  </div>
);

interface NativeSelectProps {
  id: string;
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  hideLabel?: boolean;
  triggerClassName?: string;
}

/**
 * Custom styled Radix select component replacing the browser native dropdown for a premium look.
 * With hideLabel, the label is exposed to assistive tech only (compact toolbar usage).
 *
 * @param props Select properties including id, label, value, options list and change handler.
 */
export const NativeSelect = ({
  id,
  label,
  value,
  options,
  onChange,
  hideLabel = false,
  triggerClassName
}: NativeSelectProps) => {
  const select = (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        id={id}
        density="dense"
        aria-label={hideLabel ? label : undefined}
        className={
          triggerClassName
            ?? 'w-full border-border bg-background text-xs transition-colors hover:border-border/90'
        }
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value} className="text-xs">
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  if (hideLabel) {
    return select;
  }

  return (
    <FormField label={label} htmlFor={id}>
      {select}
    </FormField>
  );
};
