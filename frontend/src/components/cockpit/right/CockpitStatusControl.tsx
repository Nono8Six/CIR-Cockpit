import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { RefObject } from 'react';

import type { AgencyConfig } from '@/services/config';
import type { AgencyStatus, StatusCategory } from '@/types';
import { STATUS_CATEGORY_LABELS, STATUS_CATEGORY_ORDER } from '@/constants/statusCategories';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

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
  layout = 'stacked'
}: CockpitStatusControlProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');

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
    <div className={cn('min-w-0', isInline ? 'grid gap-2 sm:grid-cols-[170px_minmax(0,1fr)] sm:items-center' : 'space-y-1.5')}>
      <div className="flex min-h-5 min-w-0 items-center gap-2">
        <label className={cn(footerLabelStyle, 'inline-flex h-5 items-center leading-none', isInline && 'mb-0')} htmlFor="interaction-status-trigger">Statut</label>
        {statusMeta && statusCategoryLabel ? (
          <span className={`inline-flex h-5 shrink-0 items-center whitespace-nowrap rounded-full border px-2 text-[11px] font-semibold uppercase leading-none tracking-wide ${statusCategoryBadges[statusMeta.category]}`}>
            {statusCategoryLabel}
          </span>
        ) : null}
      </div>
      <Popover open={isOpen} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            id="interaction-status-trigger"
            data-testid="cockpit-status-trigger"
            ref={statusTriggerRef}
            type="button"
            variant="outline"
            size="sm"
            disabled={!hasStatuses}
            aria-describedby={hasStatuses ? undefined : statusHelpId}
            className="h-10 w-full min-w-0 justify-between gap-2 px-2.5 text-sm font-medium text-foreground"
          >
            <span className="truncate text-left">{statusLabel}</span>
            <ChevronDown size={14} className="shrink-0 text-muted-foreground/80" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" sideOffset={6} className="w-[min(92vw,420px)] p-0">
          <Command shouldFilter={false}>
            <CommandInput
              value={query}
              onValueChange={setQuery}
              placeholder="Rechercher un statut…"
            />
            <CommandList data-testid="cockpit-status-list" className="max-h-[320px]">
              <CommandEmpty>Aucun statut trouvé.</CommandEmpty>
              {filteredSections.map((section) => (
                <CommandGroup
                  key={section.category}
                  heading={section.label}
                  data-testid={`cockpit-status-group-${section.category}`}
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
                      >
                        <span className="flex-1">{statusItem.label}</span>
                        {isCurrentStatus ? <span className="text-xs font-semibold text-primary">Actuel</span> : null}
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
