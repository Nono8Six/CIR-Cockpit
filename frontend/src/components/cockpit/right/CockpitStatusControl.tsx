import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { RefObject } from 'react';

import type { AgencyConfig } from '@/services/config';
import type { AgencyStatus, StatusCategory } from '@/types';
import { STATUS_CATEGORY_LABELS, STATUS_CATEGORY_ORDER } from '@/constants/statusCategories';
import { Button } from '@/components/ui/button';
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
  statusHelpId
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

  const statusLabel = statusMeta?.label ?? 'Selectionner un statut';

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

  return (
    <div className="grid w-full gap-2 sm:flex sm:min-w-0 sm:flex-wrap sm:items-center sm:gap-2">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <label className={footerLabelStyle} htmlFor="interaction-status-trigger">Statut</label>
        {statusMeta && statusCategoryLabel ? (
          <span className={`inline-flex shrink-0 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${statusCategoryBadges[statusMeta.category]}`}>
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
            className="h-9 w-full justify-between gap-2 px-2.5 text-xs font-semibold text-slate-700 sm:w-[260px]"
          >
            <span className="truncate text-left">{statusLabel}</span>
            <ChevronDown size={14} className="shrink-0 text-slate-400" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" sideOffset={6} className="w-[min(92vw,420px)] p-0">
          <Command shouldFilter={false}>
            <CommandInput
              value={query}
              onValueChange={setQuery}
              placeholder="Rechercher un statut..."
            />
            <CommandList data-testid="cockpit-status-list" className="max-h-[320px]">
              <CommandEmpty>Aucun statut trouve.</CommandEmpty>
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
                        {isCurrentStatus ? <span className="text-xs font-semibold text-cir-red">Actuel</span> : null}
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
