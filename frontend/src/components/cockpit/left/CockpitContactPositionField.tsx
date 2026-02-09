import type { UseFormRegisterReturn } from 'react-hook-form';

import { Input } from '@/components/ui/input';
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
