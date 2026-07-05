export const APP_SHELL_DIMENSIONS = {
  headerHeightClass: 'h-11',
  separatorTopClass: 'top-11',
  sidebarCollapsedWidth: 52,
  sidebarOpenWidth: 240,
} as const;

export const APP_SHELL_CLASSES = {
  focusRing:
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
  control:
    'h-8 w-8 rounded-lg border border-border bg-card text-muted-foreground transition-[background-color,border-color,color,box-shadow,transform] duration-150 hover:bg-muted/80 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98]',
  controlRound:
    'h-8 w-8 rounded-full border border-border bg-muted text-muted-foreground transition-[background-color,border-color,color,box-shadow,transform] duration-150 hover:bg-muted/80 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98]',
  navItem:
    'group relative flex h-8 w-full items-center rounded-lg border px-2 text-left text-[13px] transition-[background-color,border-color,color,box-shadow,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98]',
  navItemActive: 'border-primary/25 bg-primary/[0.07] font-semibold text-foreground',
  navItemInactive: 'border-transparent text-muted-foreground hover:bg-card/75 hover:text-foreground',
  sidebarCta:
    'flex h-8 w-full items-center rounded-lg bg-primary text-xs font-semibold text-primary-foreground transition-[background-color,transform] duration-150 hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-1 active:scale-[0.98]',
  sidebarFocus:
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-1',
  pageToolbar:
    'flex min-w-0 flex-col gap-2 rounded-lg border border-border/70 bg-card/80 px-2.5 py-2 sm:flex-row sm:items-center sm:justify-between',
  pageToolbarGroup: 'flex min-w-0 flex-wrap items-center gap-1.5',
  pagePanel: 'rounded-lg border border-border/70 bg-card shadow-none',
  pagePanelMuted: 'rounded-lg border border-border/70 bg-surface-1 shadow-none',
  dataHeader:
    'h-8 whitespace-nowrap bg-muted/35 px-2 text-left align-middle text-[11px] font-semibold uppercase text-muted-foreground tracking-normal',
  dataCell:
    'h-8 px-2 py-1.5 align-middle text-[12.5px] text-foreground',
  dataRow:
    'border-b border-border/55 transition-[background-color,color] duration-150 hover:bg-muted/35 data-[state=selected]:bg-muted/50',
  dataRowInteractive:
    'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/45',
  statusChip:
    'inline-flex h-5 items-center gap-1 rounded-md border border-border/70 bg-muted/40 px-1.5 text-[11px] font-medium text-muted-foreground',
  numericText: 'font-mono tabular-nums tracking-tight',
} as const;
