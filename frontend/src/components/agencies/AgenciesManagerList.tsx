import { Inbox, Loader2, TriangleAlert } from 'lucide-react';

import { Agency } from '@/types';
import { Button } from '@/components/ui/button';
import AgencyCard from './AgencyCard';

type AgenciesManagerListProps = {
  agencies: Agency[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onRename: (agency: Agency) => void;
  onToggleArchive: (agency: Agency) => void;
  onDelete: (agency: Agency) => void;
};

const AgenciesManagerList = ({
  agencies,
  isLoading,
  isError,
  onRetry,
  onRename,
  onToggleArchive,
  onDelete
}: AgenciesManagerListProps) => {
  return (
    <div className="space-y-2" data-testid="admin-agencies-list">
      {isLoading && (
        <div className="rounded-md border border-dashed border-slate-200 p-4 text-sm text-slate-500">
          <span className="inline-flex items-center gap-2">
            <Loader2 size={16} className="animate-spin" /> Chargement des agences...
          </span>
        </div>
      )}
      {isError && !isLoading && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="inline-flex items-center gap-2 font-medium">
            <TriangleAlert size={16} /> La liste des agences est indisponible.
          </p>
          <Button type="button" variant="outline" size="sm" className="mt-3" onClick={onRetry}>
            Reessayer
          </Button>
        </div>
      )}
      {!isLoading && !isError && agencies.length === 0 && (
        <div className="rounded-md border border-dashed border-slate-200 p-4 text-sm text-slate-500">
          <span className="inline-flex items-center gap-2">
            <Inbox size={16} /> Aucune agence.
          </span>
        </div>
      )}
      {agencies.map(agency => (
        <AgencyCard
          key={agency.id}
          agency={agency}
          onRename={onRename}
          onToggleArchive={onToggleArchive}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};

export default AgenciesManagerList;
