type AppHeaderStatusSectionProps = {
  profileLoading: boolean;
  isContextRefreshing: boolean;
};

const AppHeaderStatusSection = ({ profileLoading, isContextRefreshing }: AppHeaderStatusSectionProps) => (
  <>
    {profileLoading && (
      <span className="hidden md:inline text-[10px] uppercase tracking-widest text-slate-400">
        Synchronisation…
      </span>
    )}
    {isContextRefreshing && (
      <span className="hidden md:inline text-[10px] uppercase tracking-widest text-slate-400">
        Synchronisation agence…
      </span>
    )}
  </>
);

export default AppHeaderStatusSection;
