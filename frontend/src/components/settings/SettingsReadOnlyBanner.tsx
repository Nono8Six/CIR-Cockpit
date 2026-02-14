const SettingsReadOnlyBanner = () => {
  return (
    <div className="border-b border-amber-100 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-700 sm:px-6" data-testid="settings-read-only-banner">
      Mode lecture seule: les modifications sont reservees aux super_admin.
    </div>
  );
};

export default SettingsReadOnlyBanner;
