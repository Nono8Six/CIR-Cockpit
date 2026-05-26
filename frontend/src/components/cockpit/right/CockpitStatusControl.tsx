import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { RefObject } from 'react';
import { motion, useReducedMotion } from 'motion/react';

import type { AgencyConfig } from '@/services/config';
import type { AgencyStatus, StatusCategory } from '@/types';
import { STATUS_CATEGORY_LABELS, STATUS_CATEGORY_ORDER } from '@/constants/statusCategories';
import { cn } from '@/lib/utils';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '../../ui/inputs/selects/Command';
import { Popover, PopoverContent, PopoverTrigger } from '../../ui/navigation/Popover';

type CockpitStatusControlProps = {
  footerLabelStyle: string;
  statusMeta: AgencyStatus | null;
  statusCategoryLabel: string | null;
  statusCategoryBadges: Record<StatusCategory, string>;
  statusTriggerRef: RefObject<HTMLButtonElement | null>;
  statusValue: string;
  onStatusChange: (statusId: string) => void;
  statusGroups: Record<StatusCategory, AgencyConfig['statuses']>;
  hasStatuses: boolean;
  statusHelpId: string;
  layout?: 'stacked' | 'inline';
  variant?: 'default' | 'fused';
};

const CockpitStatusControl = ({
  footerLabelStyle,
  statusMeta,
  statusCategoryLabel,
  statusCategoryBadges,
  statusTriggerRef,
  statusValue,
  onStatusChange,
  statusGroups,
  hasStatuses,
  statusHelpId,
  layout = 'stacked',
  variant = 'default'
}: CockpitStatusControlProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const shouldReduceMotion = useReducedMotion();
  const isFused = variant === 'fused';

  const categorySections = useMemo(
    () =>
      STATUS_CATEGORY_ORDER
        .map((category) => ({
          category,
          label: STATUS_CATEGORY_LABELS[category],
          statuses: statusGroups[category]
        }))
        .filter((section) => section.statuses.length > 0),
    [statusGroups]
  );

  const filteredSections = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return categorySections;

    return categorySections
      .map((section) => ({
        ...section,
        statuses: section.statuses.filter((statusItem) => {
          const label = statusItem.label.toLowerCase();
          return label.includes(normalizedQuery) || section.label.toLowerCase().includes(normalizedQuery);
        })
      }))
      .filter((section) => section.statuses.length > 0);
  }, [categorySections, query]);

  const statusLabel = statusMeta?.label ?? 'Sélectionner un statut';

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setQuery('');
    }
  };

  const handleSelectStatus = (nextStatusId: string) => {
    onStatusChange(nextStatusId);
    setIsOpen(false);
    setQuery('');
  };

  const isInline = layout === 'inline';

  return (
    <div className={cn('min-w-0', isInline ? 'grid gap-2 sm:grid-cols-[170px_minmax(0,1fr)] sm:items-center' : 'space-y-0.5')}>
      <div className="flex min-h-5 min-w-0 items-center gap-2">
        <label className={cn(footerLabelStyle, 'inline-flex h-5 items-center leading-none', isInline && 'mb-0')} htmlFor="interaction-status-trigger">Statut</label>
        {statusMeta && statusCategoryLabel ? (
          <span className={cn(
            "inline-flex h-5 shrink-0 items-center whitespace-nowrap rounded-full border px-2 text-[9px] font-extrabold uppercase leading-none tracking-[0.12em] shadow-[0_1px_2px_rgba(0,0,0,0.01)]",
            statusCategoryBadges[statusMeta.category]
          )}>
            {statusCategoryLabel}
          </span>
        ) : null}
      </div>
      <Popover open={isOpen} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <motion.button
            id="interaction-status-trigger"
            data-testid="cockpit-status-trigger"
            ref={statusTriggerRef}
            type="button"
            disabled={!hasStatuses}
            aria-describedby={hasStatuses ? undefined : statusHelpId}
            whileHover={shouldReduceMotion ? {} : { scale: isFused ? 1.002 : 1.005 }}
            whileTap={shouldReduceMotion ? {} : { scale: 0.98 }}
            className={cn(
              isFused
                ? "inline-flex h-9 w-full min-w-0 items-center justify-between gap-2 border-none bg-transparent p-0 text-sm font-semibold text-foreground shadow-none outline-none focus:outline-none focus:ring-0 focus:border-none disabled:pointer-events-none disabled:opacity-50 cursor-pointer mt-1"
                : "inline-flex h-11 w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-border bg-background px-3.5 py-2 text-[13px] font-semibold text-foreground transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary/60 disabled:pointer-events-none disabled:opacity-50 cursor-pointer shadow-sm mt-1",
              !hasStatuses && "opacity-50 cursor-not-allowed"
            )}
          >
            <span className="truncate text-left text-[13px] font-semibold text-foreground/90">{statusLabel}</span>
            <ChevronDown size={14} className="shrink-0 text-muted-foreground/80" />
          </motion.button>
        </PopoverTrigger>
        <PopoverContent align="start" sideOffset={6} className="w-[min(92vw,420px)] p-0 rounded-lg border border-border/80 shadow-md">
          <Command shouldFilter={false}>
            <CommandInput
              value={query}
              onValueChange={setQuery}
              placeholder="Rechercher un statut…"
              className="h-10 text-[13px]"
            />
            <CommandList data-testid="cockpit-status-list" className="max-h-[320px]">
              <CommandEmpty className="text-xs text-muted-foreground py-6 text-center">Aucun statut trouvé.</CommandEmpty>
              {filteredSections.map((section) => (
                <CommandGroup
                  key={section.category}
                  heading={section.label}
                  data-testid={`cockpit-status-group-${section.category}`}
                  className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70"
                >
                  {section.statuses.map((statusItem, index) => {
                    const nextStatusId = statusItem.id ?? statusItem.label;
                    const isCurrentStatus = nextStatusId === statusValue;
                    return (
                      <CommandItem
                        key={nextStatusId}
                        data-testid={`cockpit-status-item-${section.category}-${index}`}
                        value={`${section.label} ${statusItem.label}`}
                        onSelect={() => handleSelectStatus(nextStatusId)}
                        className={cn(
                          "text-xs font-semibold px-2.5 py-2 cursor-pointer transition-colors duration-150",
                          isCurrentStatus && "bg-muted/70 text-foreground"
                        )}
                      >
                        <span className="flex-1 text-[13px]">{statusItem.label}</span>
                        {isCurrentStatus ? (
                          <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                            Actuel
                          </span>
                        ) : null}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default CockpitStatusControl;

