import type { UseFormRegisterReturn } from 'react-hook-form';

import { Input } from '../../ui/inputs/basic/Input';
import CockpitFieldError from './CockpitFieldError';

type CockpitContactPositionFieldProps = {
  positionField: UseFormRegisterReturn;
  positionError?: string;
};

const CockpitContactPositionField = ({
  positionField,
  positionError
}: CockpitContactPositionFieldProps) => (
  <div>
    <Input
      type="text"
      {...positionField}
      placeholder="Fonction…"
      aria-label="Fonction"
      autoComplete="organization-title"
    />
    <CockpitFieldError message={positionError} />
  </div>
);

export default CockpitContactPositionField;
