import { getPlatformShortcutLabel } from '@/app/appConstants';

type ShortcutItem = {
  keys: string;
  label: string;
};

const CHANNEL_SHORTCUTS: ShortcutItem[] = [
  { keys: 'T', label: 'tél' },
  { keys: 'E', label: 'email' },
  { keys: 'C', label: 'comptoir' },
  { keys: 'V', label: 'visite' }
];

const ShortcutKey = ({ label }: { label: string }) => (
  <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
    {label}
  </kbd>
);

type CockpitShortcutLegendProps = {
  canStartNewEntry: boolean;
};

const CockpitShortcutLegend = ({ canStartNewEntry }: CockpitShortcutLegendProps) => {
  const searchShortcut = getPlatformShortcutLabel('K');
  const submitShortcut = getPlatformShortcutLabel('\u21b5');
  const newEntryShortcut = getPlatformShortcutLabel('N');

  const actionShortcuts: ShortcutItem[] = [
    { keys: searchShortcut, label: 'chercher' },
    { keys: submitShortcut, label: 'enregistrer' },
    ...(canStartNewEntry ? [{ keys: newEntryShortcut, label: 'nouvelle' }] : []),
    { keys: '?', label: 'aide' }
  ];

  return (
    <div
      data-testid="cockpit-shortcut-legend"
      aria-label="Raccourcis clavier disponibles"
      className="shrink-0 border-t border-border bg-card/60 px-3 py-1.5 text-[11px] text-muted-foreground sm:px-5"
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-1">
        <div
          data-testid="cockpit-shortcut-legend-channels"
          className="flex flex-wrap items-center gap-x-3 gap-y-1"
        >
          {CHANNEL_SHORTCUTS.map((shortcut) => (
            <span key={shortcut.keys} className="flex items-center gap-1.5">
              <ShortcutKey label={shortcut.keys} />
              <span>{shortcut.label}</span>
            </span>
          ))}
        </div>
        <span aria-hidden="true" className="hidden text-border sm:inline">
          |
        </span>
        <div
          data-testid="cockpit-shortcut-legend-actions"
          className="flex flex-wrap items-center gap-x-3 gap-y-1"
        >
          {actionShortcuts.map((shortcut) => (
            <span key={shortcut.keys} className="flex items-center gap-1.5">
              <ShortcutKey label={shortcut.keys} />
              <span>{shortcut.label}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CockpitShortcutLegend;
