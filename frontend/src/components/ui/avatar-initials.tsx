import { cn } from '@/lib/utils';

interface AvatarInitialsProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const COLORS = [
  'bg-slate-100 text-slate-700',
  'bg-zinc-100 text-zinc-700',
  'bg-slate-200 text-slate-800',
  'bg-blue-50 text-blue-900',
  'bg-primary/10 text-primary',
  'bg-slate-50 text-slate-600',
  'bg-zinc-200 text-zinc-900',
  'bg-sky-50 text-sky-900'
];

const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const firstPart = parts[0];
  if (firstPart === undefined) return '?';
  if (parts.length === 1) return firstPart[0]!.toUpperCase();
  const lastPart = parts[parts.length - 1]!;
  return `${firstPart[0]!.toUpperCase()}${lastPart[0]!.toUpperCase()}`;
};

const getColorClass = (name: string): string => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  }
  return COLORS[Math.abs(hash) % COLORS.length]!;
};

const AvatarInitials = ({ name, size = 'sm', className }: AvatarInitialsProps) => {
  const initials = getInitials(name);
  const colorClass = getColorClass(name);
  const sizeClass = size === 'sm' ? 'size-7 text-[11px]' : size === 'md' ? 'size-9 text-xs' : 'size-10 text-sm';

  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold',
        sizeClass,
        colorClass,
        className
      )}
    >
      {initials}
    </span>
  );
};

export default AvatarInitials;
