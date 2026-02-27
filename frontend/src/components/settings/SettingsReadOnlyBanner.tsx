const SettingsReadOnlyBanner = () => {
  return (
    <div className="border-b border-warning/25 bg-warning/15 px-4 py-2 text-xs font-medium text-warning-foreground sm:px-6" data-testid="settings-read-only-banner">
      Mode lecture seule: les modifications sont reservees aux super_admin.
    </div>
  );
};

export default SettingsReadOnlyBanner;
