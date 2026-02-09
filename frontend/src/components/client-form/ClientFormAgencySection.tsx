import type { FieldErrors, UseFormRegisterReturn } from 'react-hook-form';

import type { Agency, UserRole } from '@/types';
import type { ClientFormValues } from '../../../../shared/schemas/client.schema';
import { Input } from '@/components/ui/input';

type ClientFormAgencySectionProps = {
  agencies: Agency[];
  userRole: UserRole;
  agencyField: UseFormRegisterReturn;
  agencyValue: string;
  agencyLabel: string;
  errors: FieldErrors<ClientFormValues>;
};

const ClientFormAgencySection = ({
  agencies,
  userRole,
  agencyField,
  agencyValue,
  agencyLabel,
  errors
}: ClientFormAgencySectionProps) => (
  <div>
    <label className="text-xs font-medium text-slate-500" htmlFor="client-agency">Agence</label>
    {userRole === 'tcs' ? (
      <Input value={agencyLabel} disabled />
    ) : (
      <select
        {...agencyField}
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        value={agencyValue}
        id="client-agency"
      >
        <option value="">Selectionner une agence</option>
        {agencies.map((agency) => (
          <option key={agency.id} value={agency.id}>
            {agency.name}
          </option>
        ))}
      </select>
    )}
    {errors.agency_id && (
      <p className="text-xs text-red-600 mt-1">{errors.agency_id.message}</p>
    )}
  </div>
);

export default ClientFormAgencySection;
