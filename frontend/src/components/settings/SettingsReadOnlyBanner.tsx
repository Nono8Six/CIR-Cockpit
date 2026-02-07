const SettingsReadOnlyBanner = () => {
  return (
    <div className="bg-amber-50 text-amber-700 text-xs font-medium px-6 py-2 border-b border-amber-100">
      Mode lecture seule: les modifications sont reservees aux super_admin.
    </div>
  );
};

export default SettingsReadOnlyBanner;
