type DashboardFamilyBadgesProps = {
  families: string[];
};

const DashboardFamilyBadges = ({ families }: DashboardFamilyBadgesProps) => {
  return (
    <div className="flex gap-1">
      {families.slice(0, 2).map((family) => (
        <span key={family} className="text-[9px] px-1.5 py-0.5 bg-white border border-slate-200 text-slate-500 rounded uppercase">
          {family}
        </span>
      ))}
      {families.length > 2 && (
        <span className="text-[9px] text-slate-400">+{families.length - 2}</span>
      )}
    </div>
  );
};

export default DashboardFamilyBadges;
