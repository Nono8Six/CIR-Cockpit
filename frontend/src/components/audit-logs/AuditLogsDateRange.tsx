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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div>
        <label className="text-xs font-medium text-slate-500">Du</label>
        <Input
          type="date"
          value={fromDate}
          onChange={(event) => onFromDateChange(event.target.value)}
        />
      </div>
      <div>
        <label className="text-xs font-medium text-slate-500">Au</label>
        <Input
          type="date"
          value={toDate}
          onChange={(event) => onToDateChange(event.target.value)}
        />
      </div>
    </div>
  );
};

export default AuditLogsDateRange;
