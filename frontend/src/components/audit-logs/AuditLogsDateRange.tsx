import { Input } from '@/components/ui/input';

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
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2" data-testid="admin-audit-date-range">
      <div>
        <label htmlFor={fromInputId} className="text-xs font-medium text-muted-foreground">Du</label>
        <Input
          id={fromInputId}
          type="date"
          value={fromDate}
          onChange={(event) => onFromDateChange(event.target.value)}
          data-testid="admin-audit-date-from"
        />
      </div>
      <div>
        <label htmlFor={toInputId} className="text-xs font-medium text-muted-foreground">Au</label>
        <Input
          id={toInputId}
          type="date"
          value={toDate}
          onChange={(event) => onToDateChange(event.target.value)}
          data-testid="admin-audit-date-to"
        />
      </div>
    </div>
  );
};

export default AuditLogsDateRange;
