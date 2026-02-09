import type { FieldErrors, UseFormRegisterReturn } from 'react-hook-form';

import type { ProspectFormValues } from '../../../../shared/schemas/prospect.schema';
import { Input } from '@/components/ui/input';

type ProspectFormIdentitySectionProps = {
  nameField: UseFormRegisterReturn;
  cityField: UseFormRegisterReturn;
  errors: FieldErrors<ProspectFormValues>;
};

const ProspectFormIdentitySection = ({
  nameField,
  cityField,
  errors
}: ProspectFormIdentitySectionProps) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div>
      <label className="text-xs font-medium text-slate-500" htmlFor="prospect-name">Nom de la societe</label>
      <Input {...nameField} id="prospect-name" placeholder="Nom du prospect" autoComplete="organization" />
      {errors.name && (
        <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>
      )}
    </div>
    <div>
      <label className="text-xs font-medium text-slate-500" htmlFor="prospect-city">Ville</label>
      <Input {...cityField} id="prospect-city" placeholder="Ville" autoComplete="address-level2" />
      {errors.city && (
        <p className="text-xs text-red-600 mt-1">{errors.city.message}</p>
      )}
    </div>
  </div>
);

export default ProspectFormIdentitySection;
