import { Badge } from '../ui/data-display/Badge';

type InteractionCardFamiliesProps = {
  families: string[];
};

/**
 * Renders a list of family tag badges associated with the interaction card.
 * Truncates displaying to maximum 3 items and adds a "+N" label for overflows.
 * 
 * @param {InteractionCardFamiliesProps} props - The component props.
 * @returns {React.JSX.Element | null} The rendered tags list, or null if empty.
 */
const InteractionCardFamilies = ({ families }: InteractionCardFamiliesProps) => {
  if (!families || families.length === 0) return null;

  return (
    <div className="mt-2.5 flex flex-wrap gap-1 select-none">
      {families.slice(0, 3).map((family) => (
        <Badge
          key={family}
          variant="outline"
          className="rounded-md border border-border/80 bg-muted/25 px-2.5 py-0.5 font-sans text-[8.5px] font-bold uppercase tracking-wider text-muted-foreground/80 hover:bg-muted/30 transition-colors duration-150"
        >
          {family}
        </Badge>
      ))}
      {families.length > 3 && (
        <span className="px-1 font-sans text-[8.5px] font-bold text-muted-foreground/50 self-center">
          +{families.length - 3}
        </span>
      )}
    </div>
  );
};

export default InteractionCardFamilies;
