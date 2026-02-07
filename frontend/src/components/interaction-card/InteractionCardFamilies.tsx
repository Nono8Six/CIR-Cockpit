type InteractionCardFamiliesProps = {
  families: string[];
};

const InteractionCardFamilies = ({ families }: InteractionCardFamiliesProps) => (
  <div className="flex flex-wrap gap-1 mb-3">
    {families.slice(0, 3).map((family) => (
      <span
        key={family}
        className="text-[9px] px-1.5 py-0.5 bg-slate-50 border border-slate-100 text-slate-500 rounded font-medium uppercase tracking-tight"
      >
        {family}
      </span>
    ))}
    {families.length > 3 && (
      <span className="text-[9px] px-1.5 py-0.5 text-slate-400">+{families.length - 3}</span>
    )}
  </div>
);

export default InteractionCardFamilies;
