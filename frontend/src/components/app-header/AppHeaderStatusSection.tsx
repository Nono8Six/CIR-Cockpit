type AppHeaderStatusSectionProps = {
  profileLoading: boolean;
  isContextRefreshing: boolean;
};

const AppHeaderStatusSection = ({ profileLoading, isContextRefreshing }: AppHeaderStatusSectionProps) => {
  const statusLabel = profileLoading ? 'Synchronisation du profil…' : isContextRefreshing ? 'Synchronisation agence…' : null;

  if (!statusLabel) return null;

  return <span className="hidden xl:inline text-xs uppercase tracking-widest text-muted-foreground/80">{statusLabel}</span>;
};

export default AppHeaderStatusSection;
