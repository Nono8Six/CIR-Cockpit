import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

type InteractionFooterStatusSelectProps = {
  statusOptions: { id: string; label: string }[];
  statusId: string;
  onStatusChange: (value: string) => void;
};

const InteractionFooterStatusSelect = ({
  statusOptions,
  statusId,
  onStatusChange
}: InteractionFooterStatusSelectProps) => (
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
          <SelectItem key={option.id} value={option.id}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
);

export default InteractionFooterStatusSelect;
