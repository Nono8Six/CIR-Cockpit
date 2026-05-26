import { Input } from '../ui/inputs/basic/Input';

type AuditLogsDateRangeProps = {
  fromDate: string;
  toDate: string;
  onFromDateChange: (value: string) => void;
  onToDateChange: (value: string) => void;
};

const AuditLogsDateRange = ({
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange
}: AuditLogsDateRangeProps) => {
  const fromInputId = 'admin-audit-date-from-input';
  const toInputId = 'admin-audit-date-to-input';

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2" data-testid="admin-audit-date-range">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={fromInputId} className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Du
        </label>
        <Input
          id={fromInputId}
          type="date"
          value={fromDate}
          onChange={(event) => onFromDateChange(event.target.value)}
          className="h-10 rounded-xl bg-muted/10 border-border/60 focus-visible:ring-primary/20 hover:bg-background/50 hover:border-border/80 transition-all duration-200"
          data-testid="admin-audit-date-from"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={toInputId} className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Au
        </label>
        <Input
          id={toInputId}
          type="date"
          value={toDate}
          onChange={(event) => onToDateChange(event.target.value)}
          className="h-10 rounded-xl bg-muted/10 border-border/60 focus-visible:ring-primary/20 hover:bg-background/50 hover:border-border/80 transition-all duration-200"
          data-testid="admin-audit-date-to"
        />
      </div>
    </div>
  );
};

export default AuditLogsDateRange;
