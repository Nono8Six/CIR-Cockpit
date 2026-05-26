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
  const todoStatuses = statuses.filter((s) => s.category === 'todo');
  const inProgressStatuses = statuses.filter((s) => s.category === 'in_progress');
  const doneStatuses = statuses.filter((s) => s.category === 'done');
  const lanes = [
    { title: 'À traiter', statuses: todoStatuses },
    { title: 'En cours', statuses: inProgressStatuses },
    { title: 'Terminé', statuses: doneStatuses },
  ];

  return (
    <div className="border border-border/70 bg-surface-1/45 p-3">
      <div className="mb-3">
        <h4 className="text-xs font-semibold text-foreground">Aperçu pilotage</h4>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Regroupement réel des statuts par catégorie dans le tableau de bord.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {lanes.map((lane) => (
          <div key={lane.title} className="border border-border/70 bg-background p-2">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {lane.title}
              </span>
              <span className="bg-surface-1 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-muted-foreground tabular-nums">
                {lane.statuses.length}
              </span>
            </div>
            <div className="flex min-h-[62px] flex-col gap-1.5">
              {lane.statuses.length === 0 ? (
                <div className="flex flex-1 items-center justify-center border border-dashed border-border/60 p-3 text-center text-[9px] text-muted-foreground/70">
                  Aucun statut
                </div>
              ) : (
                lane.statuses.map((status, index) => {
                  const isDefault = statuses.findIndex((item) => item.id === status.id) === 0;

                return (
                  <div
                    key={status.id || index}
                    className={`border bg-card px-2 py-1.5 text-xs shadow-sm ${
                      isDefault ? 'border-primary/40 ring-1 ring-primary/10' : 'border-border/60'
                    }`}
                  >
                    <div className="flex min-w-0 items-center justify-between gap-2">
                      <span className="truncate font-medium text-foreground">{status.label}</span>
                      {isDefault && (
                        <span className="shrink-0 text-[8px] font-semibold uppercase tracking-wider text-primary">
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
        ))}
      </div>
    </div>
  );
};

export default KanbanSimulator;
