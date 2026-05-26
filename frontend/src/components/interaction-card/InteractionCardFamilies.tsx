import { Badge } from '../ui/data-display/Badge';

type InteractionCardFamiliesProps = {
  families: string[];
};

const InteractionCardFamilies = ({ families }: InteractionCardFamiliesProps) => {
  if (!families || families.length === 0) return null;

  return (
    <div className="mt-1.5 flex flex-wrap gap-1">
      {families.slice(0, 3).map((family) => (
        <Badge
          key={family}
          variant="outline"
          className="border-border/40 bg-surface-2/65 px-1.5 py-0.5 font-mono text-[8px] font-medium uppercase tracking-wider text-muted-foreground/80 hover:bg-surface-2/65"
        >
          {family}
        </Badge>
      ))}
      {families.length > 3 && (
        <span className="px-0.5 font-mono text-[8px] font-medium text-muted-foreground/60 self-center">
          +{families.length - 3}
        </span>
      )}
    </div>
  );
};

export default InteractionCardFamilies;
