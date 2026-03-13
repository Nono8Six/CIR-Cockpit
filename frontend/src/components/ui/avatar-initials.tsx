import { cn } from '@/lib/utils';

interface AvatarInitialsProps {
  name: string;
  size?: 'sm' | 'md';
  className?: string;
}

const COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-violet-100 text-violet-700',
  'bg-rose-100 text-rose-700',
  'bg-cyan-100 text-cyan-700',
  'bg-orange-100 text-orange-700',
  'bg-indigo-100 text-indigo-700'
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
  const sizeClass = size === 'sm' ? 'size-7 text-[11px]' : 'size-9 text-xs';

  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-medium',
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
