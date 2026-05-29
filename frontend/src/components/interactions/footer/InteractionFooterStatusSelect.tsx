import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../../ui/inputs/selects/Select';

type InteractionFooterStatusSelectProps = {
  statusOptions: { id: string; label: string; isHistorical?: boolean }[];
  statusId: string;
  onStatusChange: (value: string) => void;
};

const InteractionFooterStatusSelect = ({
  statusOptions,
  statusId,
  onStatusChange
}: InteractionFooterStatusSelectProps) => {
  const selectedOption = statusOptions.find((option) => option.id === statusId);

  return (
    <div className="sm:col-span-2 lg:col-span-4">
      <label
        htmlFor="interaction-status-select"
        className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
      >
        Nouveau statut
      </label>
      <Select value={statusId} onValueChange={onStatusChange}>
        <SelectTrigger
          id="interaction-status-select"
          density="comfortable"
          className="h-9 bg-card text-sm"
          data-testid="interaction-details-status-select"
        >
          <SelectValue placeholder="Selectionner un statut" />
        </SelectTrigger>
        <SelectContent>
          {statusOptions.map((option) => (
            <SelectItem key={option.id} value={option.id} disabled={option.isHistorical}>
              <span className="inline-flex items-center gap-2">
                <span>{option.label}</span>
                {option.isHistorical ? (
                  <span className="border border-border px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
                    Historique
                  </span>
                ) : null}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selectedOption?.isHistorical ? (
        <div className="mt-1 inline-flex border border-border bg-background px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
          Historique
        </div>
      ) : null}
    </div>
  );
};

export default InteractionFooterStatusSelect;
