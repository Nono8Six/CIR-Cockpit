import type { FieldErrors, UseFormRegisterReturn } from 'react-hook-form';

import type { ClientCompanyFormUiValues } from '../../hooks/entities/clients/useClientFormDialog';
import type { Agency } from '@/types';
import type { DirectoryCommercialOption } from '../../../../shared/schemas/system/directory.schema';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../ui/inputs/selects/Select';

type ClientFormAgencySectionProps = {
  agencyField: UseFormRegisterReturn;
  agencyValue: string;
  agencies: Agency[];
  showAgencySelect: boolean;
  agencyLabel: string;
  cirCommercialField: UseFormRegisterReturn;
  cirCommercialValue: ClientCompanyFormUiValues['cir_commercial_id'];
  commercials: DirectoryCommercialOption[];
  onCommercialChange: (value: string | null) => void;
  errors: FieldErrors<ClientCompanyFormUiValues>;
};

const buildFieldChangeEvent = (name: string, value: string) => ({
  target: { name, value }
});

/**
 * Agency & Commercial attribution section for the client form.
 * Handles the assignment of the client to a specific agency and commercial.
 */
const ClientFormAgencySection = ({
  agencyField,
  agencyValue,
  agencies,
  showAgencySelect,
  agencyLabel,
  cirCommercialField,
  cirCommercialValue,
  commercials,
  onCommercialChange,
  errors
}: ClientFormAgencySectionProps) => (
  <div className="space-y-4">
    <div className="text-[11px] font-mono font-bold uppercase tracking-widest text-neutral-400 border-b border-neutral-100 pb-1.5">
      05. Attribution & Agence
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div>
        <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400 mb-1.5 block" htmlFor="client-agency">
          Agence
        </label>
        {showAgencySelect ? (
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
              value={agencyValue}
              onValueChange={(value) => agencyField.onChange(buildFieldChangeEvent(agencyField.name, value))}
              name={agencyField.name}
            >
              <SelectTrigger
                id="client-agency"
                onBlur={agencyField.onBlur}
                aria-invalid={Boolean(errors.agency_id)}
                className="!h-8 !text-xs !px-2.5 !bg-neutral-50/50 !border-neutral-200 hover:!bg-neutral-50 hover:!border-neutral-300 focus:!bg-white focus:!border-neutral-400 focus:!ring-0 !rounded-md !shadow-none transition-all text-neutral-800 w-full"
              >
                <SelectValue placeholder="Sélectionner..." />
              </SelectTrigger>
              <SelectContent>
                {agencies.map((agency) => (
                  <SelectItem key={agency.id} value={agency.id}>{agency.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.agency_id && (
              <p className="text-destructive text-[10px] font-medium mt-1">{errors.agency_id.message}</p>
            )}
          </>
        ) : (
          <div className="h-8 px-2.5 bg-neutral-100/40 border border-neutral-200/50 rounded-md flex items-center text-xs text-neutral-500 w-full select-none">
            {agencyLabel}
          </div>
        )}
      </div>
      <div>
        <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400 mb-1.5 block" htmlFor="client-commercial">
          Commercial CIR
        </label>
        <input
          type="hidden"
          name={cirCommercialField.name}
          ref={cirCommercialField.ref}
          value={cirCommercialValue ?? ''}
          onChange={cirCommercialField.onChange}
          onBlur={cirCommercialField.onBlur}
        />
        <Select
          value={cirCommercialValue ?? '__none__'}
          onValueChange={(value) => onCommercialChange(value === '__none__' ? null : value)}
          name={cirCommercialField.name}
        >
          <SelectTrigger
            id="client-commercial"
            onBlur={cirCommercialField.onBlur}
            className="!h-8 !text-xs !px-2.5 !bg-neutral-50/50 !border-neutral-200 hover:!bg-neutral-50 hover:!border-neutral-300 focus:!bg-white focus:!border-neutral-400 focus:!ring-0 !rounded-md !shadow-none transition-all text-neutral-800 w-full"
          >
            <SelectValue placeholder="Non attribué" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Non attribué</SelectItem>
            {commercials.map((commercial) => (
              <SelectItem key={commercial.id} value={commercial.id}>{commercial.display_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  </div>
);

export default ClientFormAgencySection;
