type SettingsReadOnlyBannerProps = {
  readOnly: boolean;
  canEditProductSettings: boolean;
};

const SettingsReadOnlyBanner = ({
  readOnly,
  canEditProductSettings
}: SettingsReadOnlyBannerProps) => {
  const message = readOnly
    ? 'Mode lecture seule: les modifications sont reservees aux administrateurs.'
    : canEditProductSettings
      ? ''
      : 'Les parametres produit restent reserves aux super_admin. Les referentiels agence restent modifiables.';

  if (!message) return null;

  return (
    <div className="border-b border-warning/25 bg-warning/15 px-4 py-2 text-xs font-medium text-warning-foreground sm:px-6" data-testid="settings-read-only-banner">
      {message}
    </div>
  );
};

export default SettingsReadOnlyBanner;
