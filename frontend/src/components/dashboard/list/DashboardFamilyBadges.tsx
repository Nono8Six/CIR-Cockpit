import { Badge } from '../../ui/data-display/Badge';

type DashboardFamilyBadgesProps = {
  families: string[];
};

const DashboardFamilyBadges = ({ families }: DashboardFamilyBadgesProps) => (
  <div className="flex flex-wrap gap-1">
    {families.slice(0, 2).map((family) => (
      <Badge
        key={family}
        variant="outline"
        className="border-border/50 bg-surface-1 px-1 py-0.5 font-mono text-[9px] font-medium uppercase tracking-wider text-muted-foreground"
      >
        {family}
      </Badge>
    ))}
    {families.length > 2 && (
      <span className="font-mono text-[9px] font-medium text-muted-foreground/80">+{families.length - 2}</span>
    )}
  </div>
);

export default DashboardFamilyBadges;
