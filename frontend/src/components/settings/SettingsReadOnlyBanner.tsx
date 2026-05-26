type SettingsReadOnlyBannerProps = {
  readOnly: boolean;
};

const SettingsReadOnlyBanner = ({
  readOnly,
}: SettingsReadOnlyBannerProps) => {
  const message = readOnly
    ? 'Mode lecture seule: les modifications sont reservees aux administrateurs.'
    : '';

  if (!message) return null;

  return (
    <div
      className="border-b border-warning/25 bg-warning/10 px-4 py-2 text-xs font-medium text-warning-foreground sm:px-5"
      data-testid="settings-read-only-banner"
      role="status"
    >
      <span className="inline-flex max-w-[90ch] items-center gap-2">
        <span className="size-1.5 shrink-0 rounded-full bg-warning" aria-hidden="true" />
        {message}
      </span>
    </div>
  );
};

export default SettingsReadOnlyBanner;
