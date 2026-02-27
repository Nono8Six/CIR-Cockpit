import type { FieldErrors, UseFormRegisterReturn } from 'react-hook-form';

import type { Agency, UserRole } from '@/types';
import type { ClientFormValues } from '../../../../shared/schemas/client.schema';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

type ClientFormAgencySectionProps = {
  agencies: Agency[];
  userRole: UserRole;
  agencyField: UseFormRegisterReturn;
  agencyValue: string;
  agencyLabel: string;
  errors: FieldErrors<ClientFormValues>;
};

const buildFieldChangeEvent = (name: string, value: string) => ({
  target: { name, value }
});

const ClientFormAgencySection = ({
  agencies,
  userRole,
  agencyField,
  agencyValue,
  agencyLabel,
  errors
}: ClientFormAgencySectionProps) => {
  const EMPTY_AGENCY_VALUE = '__none__';
  const selectValue = agencyValue || EMPTY_AGENCY_VALUE;

  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground" htmlFor="client-agency">Agence</label>
      {userRole === 'tcs' ? (
        <Input value={agencyLabel} disabled />
      ) : (
        <>
          <input
            type="hidden"
            name={agencyField.name}
            ref={agencyField.ref}
            value={agencyValue}
            onChange={agencyField.onChange}
            onBlur={agencyField.onBlur}
          />
          <Select
            value={selectValue}
            onValueChange={(value) => agencyField.onChange(buildFieldChangeEvent(
              agencyField.name,
              value === EMPTY_AGENCY_VALUE ? '' : value
            ))}
            name={agencyField.name}
          >
            <SelectTrigger
              id="client-agency"
              onBlur={agencyField.onBlur}
              aria-invalid={Boolean(errors.agency_id)}
            >
              <SelectValue placeholder="Selectionner une agence" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={EMPTY_AGENCY_VALUE}>Selectionner une agence</SelectItem>
              {agencies.map((agency) => (
                <SelectItem key={agency.id} value={agency.id}>
                  {agency.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      )}
      {errors.agency_id && (
        <p className="text-xs text-destructive mt-1">{errors.agency_id.message}</p>
      )}
    </div>
  );
};

export default ClientFormAgencySection;
