import { Agency } from '@/types';
import AgencyCard from './AgencyCard';

type AgenciesManagerListProps = {
  agencies: Agency[];
  isLoading: boolean;
  onRename: (agency: Agency) => void;
  onToggleArchive: (agency: Agency) => void;
  onDelete: (agency: Agency) => void;
};

const AgenciesManagerList = ({
  agencies,
  isLoading,
  onRename,
  onToggleArchive,
  onDelete
}: AgenciesManagerListProps) => {
  return (
    <div className="space-y-2">
      {isLoading && (
        <div className="text-sm text-slate-400 border border-dashed border-slate-200 rounded-md p-4">
          Chargement des agences...
        </div>
      )}
      {!isLoading && agencies.length === 0 && (
        <div className="text-sm text-slate-400 border border-dashed border-slate-200 rounded-md p-4">
          Aucune agence.
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
