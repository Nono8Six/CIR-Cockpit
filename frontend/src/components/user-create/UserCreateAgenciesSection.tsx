import type { Agency } from '@/types';

type UserCreateAgenciesSectionProps = {
  agencies: Agency[];
  selectedAgencyIds: string[];
  onToggleAgency: (agency: Agency) => void;
};

const UserCreateAgenciesSection = ({
  agencies,
  selectedAgencyIds,
  onToggleAgency
}: UserCreateAgenciesSectionProps) => {
  return (
    <div>
      <label className="text-xs font-medium text-slate-500">Agences</label>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
        {agencies.map(agency => (
          <label key={agency.id} className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={selectedAgencyIds.includes(agency.id)}
              onChange={() => onToggleAgency(agency)}
            />
            {agency.name}
          </label>
        ))}
        {agencies.length === 0 && (
          <p className="text-xs text-slate-400">Aucune agence disponible.</p>
        )}
      </div>
    </div>
  );
};

export default UserCreateAgenciesSection;
