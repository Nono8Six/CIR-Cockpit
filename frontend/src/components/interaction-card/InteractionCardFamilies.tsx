import { Badge } from '@/components/ui/badge';

type InteractionCardFamiliesProps = {
  families: string[];
};

const InteractionCardFamilies = ({ families }: InteractionCardFamiliesProps) => (
  <div className="mt-2 flex flex-wrap gap-1.5">
    {families.slice(0, 3).map((family) => (
      <Badge
        key={family}
        variant="outline"
        className="border-border bg-surface-1 px-1.5 py-0.5 text-xs font-medium uppercase tracking-wide text-muted-foreground"
      >
        {family}
      </Badge>
    ))}
    {families.length > 3 && (
      <span className="px-1 text-xs font-medium text-muted-foreground">
        +{families.length - 3}
      </span>
    )}
  </div>
);

export default InteractionCardFamilies;
