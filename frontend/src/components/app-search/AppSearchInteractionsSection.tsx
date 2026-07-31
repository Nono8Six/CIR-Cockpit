import { ClipboardList } from 'lucide-react';

import type { Interaction } from '@/types';
import { formatDate } from '@/utils/date/formatDate';
import AppSearchGroup from './AppSearchGroup';
import AppSearchRow from './AppSearchRow';

type AppSearchInteractionsSectionProps = {
  interactions: Interaction[];
  onOpenInteraction: (interaction: Interaction) => void;
};

const AppSearchInteractionsSection = ({
  interactions,
  onOpenInteraction
}: AppSearchInteractionsSectionProps) => {
  if (interactions.length === 0) return null;

  return (
    <AppSearchGroup heading="Interactions">
      {interactions.map((interaction) => (
        <AppSearchRow
          key={interaction.id}
          value={`interaction ${interaction.company_name} ${interaction.subject ?? ''} ${interaction.contact_name ?? ''} ${interaction.order_ref ?? ''}`}
          onSelect={() => onOpenInteraction(interaction)}
          icon={ClipboardList}
          label={interaction.subject || interaction.company_name}
          detail={[
            interaction.company_name,
            interaction.contact_name,
            interaction.order_ref ? `#${interaction.order_ref}` : null
          ].filter(Boolean).join(' · ')}
          meta={formatDate(interaction.created_at)}
          testId={`app-search-interaction-${interaction.id}`}
        />
      ))}
    </AppSearchGroup>
  );
};

export default AppSearchInteractionsSection;
