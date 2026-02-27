import { Badge } from '@/components/ui/badge';

type DashboardFamilyBadgesProps = {
  families: string[];
};

const DashboardFamilyBadges = ({ families }: DashboardFamilyBadgesProps) => (
  <div className="flex flex-wrap gap-1">
    {families.slice(0, 2).map((family) => (
      <Badge
        key={family}
        variant="outline"
        className="border-border bg-surface-1 px-1.5 py-0.5 text-xs font-medium uppercase tracking-wide text-muted-foreground"
      >
        {family}
      </Badge>
    ))}
    {families.length > 2 && (
      <span className="text-xs font-medium text-muted-foreground">+{families.length - 2}</span>
    )}
  </div>
);

export default DashboardFamilyBadges;
