import type { FieldErrors, UseFormRegisterReturn } from 'react-hook-form';

import type { Agency, UserRole } from '@/types';
import type { ProspectFormValues } from '../../../../shared/schemas/prospect.schema';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

type ProspectFormMetaSectionProps = {
  siretField: UseFormRegisterReturn;
  agencyField: UseFormRegisterReturn;
  agencyValue: string;
  agencies: Agency[];
  userRole: UserRole;
  agencyLabel: string;
  errors: FieldErrors<ProspectFormValues>;
};

const buildFieldChangeEvent = (name: string, value: string) => ({
  target: { name, value }
});

const ProspectFormMetaSection = ({
  siretField,
  agencyField,
  agencyValue,
  agencies,
  userRole,
  agencyLabel,
  errors
}: ProspectFormMetaSectionProps) => {
  const EMPTY_AGENCY_VALUE = '__none__';
  const selectValue = agencyValue || EMPTY_AGENCY_VALUE;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="text-xs font-medium text-muted-foreground" htmlFor="prospect-siret">SIRET (optionnel)</label>
        <Input {...siretField} id="prospect-siret" placeholder="SIRET" inputMode="numeric" />
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground" htmlFor="prospect-agency">Agence</label>
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
                id="prospect-agency"
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
    </div>
  );
};

export default ProspectFormMetaSection;
