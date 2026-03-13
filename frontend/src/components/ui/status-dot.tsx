import { cn } from '@/lib/utils';

interface StatusDotProps {
  entityType: 'Client' | 'Prospect';
  archivedAt: string | null;
  className?: string;
}

const StatusDot = ({ entityType, archivedAt, className }: StatusDotProps) => {
  const isArchived = archivedAt !== null;
  const colorClass = isArchived
    ? 'bg-amber-400'
    : entityType === 'Client'
      ? 'bg-emerald-500'
      : 'bg-blue-500';

  const label = isArchived
    ? 'Archivé'
    : entityType === 'Client'
      ? 'Client actif'
      : 'Prospect actif';

  return (
    <span
      role="img"
      aria-label={label}
      className={cn('inline-block size-2 shrink-0 rounded-full', colorClass, className)}
    />
  );
};

export default StatusDot;
