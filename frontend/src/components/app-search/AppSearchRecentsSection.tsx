import { Building2, User } from 'lucide-react';

import type { Entity } from '@/types';
import { formatClientNumber } from '@/utils/clients/formatClientNumber';
import AppSearchGroup from './AppSearchGroup';
import AppSearchRow from './AppSearchRow';

type AppSearchRecentsSectionProps = {
  recents: Entity[];
  onSelectEntity: (entity: Entity) => void;
};

const INDIVIDUAL_PATTERN = /partic|person/i;

const AppSearchRecentsSection = ({ recents, onSelectEntity }: AppSearchRecentsSectionProps) => {
  if (recents.length === 0) return null;

  return (
    <AppSearchGroup heading="Récents">
      {recents.map((entity) => (
        <AppSearchRow
          key={entity.id}
          value={`recent ${entity.name} ${entity.client_number ?? ''}`}
          onSelect={() => onSelectEntity(entity)}
          icon={INDIVIDUAL_PATTERN.test(entity.entity_type ?? '') ? User : Building2}
          label={entity.name}
          detail={entity.city ?? undefined}
          meta={formatClientNumber(entity.client_number) || undefined}
          testId={`app-search-recent-${entity.id}`}
        />
      ))}
    </AppSearchGroup>
  );
};

export default AppSearchRecentsSection;
