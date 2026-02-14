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
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2" data-testid="admin-audit-date-range">
      <div>
        <label className="text-xs font-medium text-slate-500">Du</label>
        <Input
          type="date"
          value={fromDate}
          onChange={(event) => onFromDateChange(event.target.value)}
          data-testid="admin-audit-date-from"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-slate-500">Au</label>
        <Input
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
