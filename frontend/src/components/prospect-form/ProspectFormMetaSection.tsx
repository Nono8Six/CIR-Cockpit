import type { FieldErrors, UseFormRegisterReturn } from 'react-hook-form';

import type { Agency, UserRole } from '@/types';
import type { ProspectFormValues } from '../../../../shared/schemas/prospect.schema';
import { Input } from '@/components/ui/input';

type ProspectFormMetaSectionProps = {
  siretField: UseFormRegisterReturn;
  agencyField: UseFormRegisterReturn;
  agencyValue: string;
  agencies: Agency[];
  userRole: UserRole;
  agencyLabel: string;
  errors: FieldErrors<ProspectFormValues>;
};

const ProspectFormMetaSection = ({
  siretField,
  agencyField,
  agencyValue,
  agencies,
  userRole,
  agencyLabel,
  errors
}: ProspectFormMetaSectionProps) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <label className="text-xs font-medium text-slate-500" htmlFor="prospect-siret">SIRET (optionnel)</label>
      <Input {...siretField} id="prospect-siret" placeholder="SIRET" inputMode="numeric" />
    </div>
    <div>
      <label className="text-xs font-medium text-slate-500" htmlFor="prospect-agency">Agence</label>
      {userRole === 'tcs' ? (
        <Input value={agencyLabel} disabled />
      ) : (
        <select
          {...agencyField}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          value={agencyValue}
          id="prospect-agency"
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
        <p className="text-[11px] text-red-600 mt-1">{errors.agency_id.message}</p>
      )}
    </div>
  </div>
);

export default ProspectFormMetaSection;
