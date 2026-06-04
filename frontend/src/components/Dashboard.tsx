import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { AgencyStatus, Interaction } from '@/types';
import { ConvertClientEntity } from './ConvertClientDialog';
import DashboardToolbar from './dashboard/DashboardToolbar';
import DashboardKanban from './dashboard/DashboardKanban';
import DashboardList from './dashboard/DashboardList';
import DashboardDetailsOverlay from './dashboard/DashboardDetailsOverlay';
import ConfirmDialog from './ConfirmDialog';
import { useDashboardState } from '@/hooks/dashboard-state/useDashboardState';
import { dashboardSearchStateSchema } from '@/app/dashboardSearch';
import type { AgencyConfig } from '@/services/config';

interface DashboardProps {
  interactions: Interaction[];
  statuses: AgencyStatus[];
  historicalStatuses?: AgencyStatus[];
  agencyId: string | null;
  onRequestConvert: (entity: ConvertClientEntity) => void;
  resolutions?: NonNullable<AgencyConfig['resolutions']>;
}

const Dashboard = ({
  interactions,
  statuses,
  historicalStatuses = [],
  agencyId,
  onRequestConvert,
  resolutions = []
}: DashboardProps) => {
  const navigate = useNavigate({ from: '/dashboard' });
  const rawSearch = useSearch({ strict: false });
  const dashboardSearch = dashboardSearchStateSchema.safeParse(rawSearch);
  const requestedInteractionId = dashboardSearch.success ? dashboardSearch.data.interactionId : undefined;
  const displayStatuses = useMemo(
    () => [...statuses, ...historicalStatuses],
    [historicalStatuses, statuses]
  );
  const {
    viewMode,
    searchTerm,
    selectedInteraction,
    period,
    periodErrorMessage,
    effectiveStartDate,
    effectiveEndDate,
    filteredData,
    kanbanColumns,
    getStatusMeta,
    getStatusBadgeClass,
    getChannelIcon,
    setViewMode,
    setSearchTerm,
    setPeriod,
    setSelectedInteraction,
    handleDateRangeChange,
    handleStartDateChange,
    handleEndDateChange,
    handleConvertRequest,
    handleInteractionUpdate,
    interactionToDelete,
    isDeleteInteractionPending,
    setInteractionToDelete,
    handleRequestDeleteInteraction,
    handleConfirmDeleteInteraction
  } = useDashboardState({ interactions, statuses: displayStatuses, agencyId, onRequestConvert, resolutions });

  const [activeInteractionId, setActiveInteractionId] = useState<string | null>(null);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dateFiltersRef = useRef<HTMLButtonElement>(null);
  const requestedInteraction = useMemo(
    () => interactions.find((item) => item.id === requestedInteractionId) ?? null,
    [interactions, requestedInteractionId]
  );
  const displayedInteraction = selectedInteraction ?? requestedInteraction;
  const displayedActiveInteractionId = activeInteractionId ?? requestedInteractionId ?? null;
  useEffect(() => {
    if (!requestedInteractionId) return;
    if (requestedInteraction) return;
    void navigate({ search: (previous) => ({ ...previous, interactionId: undefined }), replace: true });
  }, [navigate, requestedInteraction, requestedInteractionId]);

  const handleSelectInteraction = useCallback((interaction: Interaction) => {
    setActiveInteractionId(interaction.id);
    setSelectedInteraction(interaction);
  }, [setSelectedInteraction]);

  // Keyboard navigation & shortcuts hook
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const activeEl = document.activeElement;
      
      // Prevent shortcut interference if typing in form controls
      if (
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement ||
        (activeEl as HTMLElement)?.isContentEditable ||
        activeEl?.closest('[role="dialog"]') ||
        activeEl?.closest('[role="menu"]')
      ) {
        return;
      }

      // 1. Focus Search Input: "/"
      if (event.key === '/') {
        event.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }

      // 2. Focus Date Filters: "d" or "D"
      if (event.key.toLowerCase() === 'd') {
        event.preventDefault();
        dateFiltersRef.current?.focus();
        return;
      }

      // 3. Toggle View Mode: "v" or "V"
      if (event.key.toLowerCase() === 'v') {
        event.preventDefault();
        setViewMode(viewMode === 'kanban' ? 'list' : 'kanban');
        return;
      }

      // 4. Arrow Key Navigation
      if (viewMode === 'list') {
        const rowsCount = filteredData.length;
        if (rowsCount === 0) return;

        const currentIndex = filteredData.findIndex((item) => item.id === activeInteractionId);

        if (event.key === 'ArrowDown') {
          event.preventDefault();
          const nextIndex = currentIndex === -1 ? 0 : Math.min(currentIndex + 1, rowsCount - 1);
          setActiveInteractionId(filteredData[nextIndex]?.id ?? null);
        } else if (event.key === 'ArrowUp') {
          event.preventDefault();
          const nextIndex = currentIndex === -1 ? 0 : Math.max(currentIndex - 1, 0);
          setActiveInteractionId(filteredData[nextIndex]?.id ?? null);
        }
      } else {
        if (!kanbanColumns) return;
        const columnsList = [
          { key: 'urgencies' as const, items: kanbanColumns.urgencies },
          { key: 'inProgress' as const, items: kanbanColumns.inProgress },
          { key: 'completed' as const, items: kanbanColumns.completed }
        ];

        let currentColIdx = -1;
        let currentItemIdx = -1;

        for (let c = 0; c < 3; c++) {
          const idx = columnsList[c].items.findIndex((item) => item.id === activeInteractionId);
          if (idx !== -1) {
            currentColIdx = c;
            currentItemIdx = idx;
            break;
          }
        }

        if (event.key === 'ArrowDown') {
          event.preventDefault();
          if (currentColIdx === -1) {
            const firstNonEmptyCol = columnsList.find((col) => col.items.length > 0);
            if (firstNonEmptyCol) {
              setActiveInteractionId(firstNonEmptyCol.items[0].id);
            }
          } else {
            const colItems = columnsList[currentColIdx].items;
            const nextIdx = Math.min(currentItemIdx + 1, colItems.length - 1);
            setActiveInteractionId(colItems[nextIdx].id);
          }
        } else if (event.key === 'ArrowUp') {
          event.preventDefault();
          if (currentColIdx !== -1) {
            const colItems = columnsList[currentColIdx].items;
            const nextIdx = Math.max(currentItemIdx - 1, 0);
            setActiveInteractionId(colItems[nextIdx].id);
          }
        } else if (event.key === 'ArrowRight') {
          event.preventDefault();
          if (currentColIdx !== -1 && currentColIdx < 2) {
            const nextColIdx = currentColIdx + 1;
            const nextColItems = columnsList[nextColIdx].items;
            if (nextColItems.length > 0) {
              const targetIdx = Math.min(currentItemIdx, nextColItems.length - 1);
              setActiveInteractionId(nextColItems[targetIdx].id);
            }
          }
        } else if (event.key === 'ArrowLeft') {
          event.preventDefault();
          if (currentColIdx > 0) {
            const nextColIdx = currentColIdx - 1;
            const nextColItems = columnsList[nextColIdx].items;
            if (nextColItems.length > 0) {
              const targetIdx = Math.min(currentItemIdx, nextColItems.length - 1);
              setActiveInteractionId(nextColItems[targetIdx].id);
            }
          }
        }
      }

      // 5. Open selected item: "Enter" or "o"
      if (activeInteractionId && (event.key === 'Enter' || event.key.toLowerCase() === 'o')) {
        event.preventDefault();
        const activeItem = filteredData.find((item) => item.id === activeInteractionId);
        if (activeItem) {
          setSelectedInteraction(activeItem);
        }
        return;
      }

      // 6. Delete selected item: "Backspace" or "Delete"
      if (activeInteractionId && (event.key === 'Backspace' || event.key === 'Delete')) {
        event.preventDefault();
        const activeItem = filteredData.find((item) => item.id === activeInteractionId);
        if (activeItem) {
          handleRequestDeleteInteraction(activeItem);
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    viewMode,
    filteredData,
    activeInteractionId,
    kanbanColumns,
    setSelectedInteraction,
    setViewMode,
    handleRequestDeleteInteraction
  ]);

  return (
    <div
      className="relative flex h-full min-h-0 flex-col overflow-hidden bg-transparent"
      data-testid="dashboard-root"
    >
      <DashboardToolbar
        searchRef={searchInputRef}
        dateFiltersRef={dateFiltersRef}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        period={period}
        onPeriodChange={setPeriod}
        periodErrorMessage={periodErrorMessage}
        effectiveStartDate={effectiveStartDate}
        effectiveEndDate={effectiveEndDate}
        onDateRangeChange={handleDateRangeChange}
        onStartDateChange={handleStartDateChange}
        onEndDateChange={handleEndDateChange}
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
      />

      <div className="relative flex-1 min-h-0 bg-surface-1">
        {viewMode === 'kanban' && kanbanColumns ? (
          <DashboardKanban
            columns={kanbanColumns}
            onSelectInteraction={handleSelectInteraction}
            getStatusMeta={getStatusMeta}
            onDeleteInteraction={handleRequestDeleteInteraction}
            activeInteractionId={displayedActiveInteractionId}
          />
        ) : null}

        {viewMode === 'list' ? (
          <DashboardList
            rows={filteredData}
            getChannelIcon={getChannelIcon}
            getStatusBadgeClass={getStatusBadgeClass}
            onSelectInteraction={handleSelectInteraction}
            onDeleteInteraction={handleRequestDeleteInteraction}
            activeInteractionId={displayedActiveInteractionId}
          />
        ) : null}
      </div>

      {displayedInteraction && (
        <DashboardDetailsOverlay
          interaction={displayedInteraction}
          onClose={() => {
            setSelectedInteraction(null);
            void navigate({ search: (previous) => ({ ...previous, interactionId: undefined }), replace: true });
          }}
          onUpdate={handleInteractionUpdate}
          statuses={statuses}
          historicalStatuses={historicalStatuses}
          onRequestConvert={handleConvertRequest}
          onDeleteInteraction={handleRequestDeleteInteraction}
        />
      )}

      <ConfirmDialog
        open={interactionToDelete !== null}
        onOpenChange={(open) => {
          if (!open && !isDeleteInteractionPending) {
            setInteractionToDelete(null);
          }
        }}
        title="Supprimer cette interaction"
        description={`L'interaction "${interactionToDelete?.subject ?? ''}" sera définitivement supprimée.`}
        confirmLabel={isDeleteInteractionPending ? 'Suppression…' : 'Supprimer'}
        variant="destructive"
        onConfirm={() => {
          void handleConfirmDeleteInteraction();
        }}
      />
    </div>
  );
};

export default memo(Dashboard);

