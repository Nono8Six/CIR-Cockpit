import { Search } from 'lucide-react';
import type { KeyboardEvent } from 'react';

import { Input } from '@/components/ui/input';

interface DirectorySearchInputProps {
  value: string;
  placeholder: string;
  ariaLabel: string;
  onValueChange: (value: string) => void;
  onCommit: (value: string | undefined) => void;
  className?: string;
}

const DirectorySearchInput = ({
  value,
  placeholder,
  ariaLabel,
  onValueChange,
  onCommit,
  className
}: DirectorySearchInputProps) => {
  const commitValue = () => {
    const normalizedValue = value.trim();
    onCommit(normalizedValue || undefined);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') {
      return;
    }

    event.preventDefault();
    commitValue();
  };

  return (
    <div className={className}>
      <div className="relative">
        <Search
          size={14}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          onBlur={commitValue}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label={ariaLabel}
          name="directory-search"
          autoComplete="off"
          spellCheck={false}
          className="pl-9"
        />
      </div>
    </div>
  );
};

export default DirectorySearchInput;
