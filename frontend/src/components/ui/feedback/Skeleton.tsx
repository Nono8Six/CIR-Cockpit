import { cn } from '@/lib/utils';

const Skeleton = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('skeleton-shimmer rounded-md', className)}
    {...props}
  />
);

export { Skeleton };
