import { CircleArrowUp } from 'lucide-react';

import type { Entity } from '@/types';
import type { ConvertClientEntity } from '@/components/ConvertClientDialog';
import { Badge } from '../ui/data-display/Badge';
import AppSearchGroup from './AppSearchGroup';
import AppSearchRow from './AppSearchRow';

type AppSearchProspectsSectionProps = {
  prospects: Entity[];
  onRequestConvert: (entity: ConvertClientEntity) => void;
};

const AppSearchProspectsSection = ({
  prospects,
  onRequestConvert
}: AppSearchProspectsSectionProps) => {
  if (prospects.length === 0) return null;

  return (
    <AppSearchGroup heading="Prospects">
      {prospects.map((entity) => (
        <AppSearchRow
          key={entity.id}
          value={`prospect ${entity.name} ${entity.city ?? ''} convertir`}
          onSelect={() => onRequestConvert({
            id: entity.id,
            name: entity.name,
            client_number: entity.client_number ?? null,
            account_type: entity.account_type ?? null
          })}
          icon={CircleArrowUp}
          label={entity.name}
          detail={entity.city ?? undefined}
          testId={`app-search-prospect-${entity.id}`}
          trailing={(
            <Badge variant="outline" density="dense" className="shrink-0">
              Convertir
            </Badge>
          )}
        />
      ))}
    </AppSearchGroup>
  );
};

export default AppSearchProspectsSection;
