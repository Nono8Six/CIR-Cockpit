import type { AgencyStatus } from '@/types';

type KanbanSimulatorProps = {
  statuses: AgencyStatus[];
};

/**
 * Visual interactive mini-dashboard simulator displaying configured statuses
 * grouped chronologically in Kanban swimlanes: À traiter, En cours, Terminé.
 *
 * @param {KanbanSimulatorProps} props - The component props.
 * @param {AgencyStatus[]} props.statuses - The active list of configured statuses.
 * @returns {JSX.Element} The rendered Kanban board simulator.
 */
const KanbanSimulator = ({ statuses }: KanbanSimulatorProps) => {
  // Group statuses by their categories
  const todoStatuses = statuses.filter((s) => s.category === 'todo');
  const inProgressStatuses = statuses.filter((s) => s.category === 'in_progress');
  const doneStatuses = statuses.filter((s) => s.category === 'done');

  return (
    <div className="mt-6 rounded-xl border border-border bg-surface-1/30 p-4">
      <div className="mb-4">
        <h4 className="text-xs font-semibold text-foreground">
          Simulateur de Tableau de Bord (Aperçu)
        </h4>
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Visualisez en temps réel comment vos étapes de workflow s&apos;aligneront dans le tableau de bord Kanban principal.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {/* Lane: À traiter */}
        <div className="flex flex-col rounded-lg border border-border/80 bg-surface-1/60 p-2.5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              À traiter
            </span>
            <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground">
              {todoStatuses.length}
            </span>
          </div>
          <div className="flex-1 space-y-1.5 min-h-[90px] flex flex-col">
            {todoStatuses.length === 0 ? (
              <div className="flex flex-1 items-center justify-center rounded border border-dashed border-border/40 text-[9px] text-muted-foreground/40 p-4 text-center">
                Aucun statut
              </div>
            ) : (
              todoStatuses.map((status, index) => {
                const isDefault = statuses.findIndex((s) => s.id === status.id) === 0;
                return (
                  <div
                    key={status.id || index}
                    className={`rounded border px-2 py-1.5 text-xs shadow-sm bg-card transition-all ${
                      isDefault
                        ? 'border-primary/40 ring-1 ring-primary/10'
                        : 'border-border/60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate font-medium text-foreground">{status.label}</span>
                      {isDefault && (
                        <span className="shrink-0 text-[8px] font-bold uppercase text-primary tracking-wider">
                          Défaut
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Lane: En cours */}
        <div className="flex flex-col rounded-lg border border-border/80 bg-surface-1/60 p-2.5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              En cours
            </span>
            <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground">
              {inProgressStatuses.length}
            </span>
          </div>
          <div className="flex-1 space-y-1.5 min-h-[90px] flex flex-col">
            {inProgressStatuses.length === 0 ? (
              <div className="flex flex-1 items-center justify-center rounded border border-dashed border-border/40 text-[9px] text-muted-foreground/40 p-4 text-center">
                Aucun statut
              </div>
            ) : (
              inProgressStatuses.map((status, index) => {
                return (
                  <div
                    key={status.id || index}
                    className="rounded border border-border/60 bg-card px-2 py-1.5 text-xs shadow-sm transition-all"
                  >
                    <span className="truncate font-medium text-foreground">{status.label}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Lane: Terminé */}
        <div className="flex flex-col rounded-lg border border-border/80 bg-surface-1/60 p-2.5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Terminé
            </span>
            <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground">
              {doneStatuses.length}
            </span>
          </div>
          <div className="flex-1 space-y-1.5 min-h-[90px] flex flex-col">
            {doneStatuses.length === 0 ? (
              <div className="flex flex-1 items-center justify-center rounded border border-dashed border-border/40 text-[9px] text-muted-foreground/40 p-4 text-center">
                Aucun statut
              </div>
            ) : (
              doneStatuses.map((status, index) => {
                return (
                  <div
                    key={status.id || index}
                    className="rounded border border-border/60 bg-card px-2 py-1.5 text-xs shadow-sm transition-all"
                  >
                    <span className="truncate font-medium text-foreground">{status.label}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default KanbanSimulator;
