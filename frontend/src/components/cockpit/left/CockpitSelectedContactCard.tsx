import { RotateCcw } from 'lucide-react';

import EntityContactRow from '@/components/entity-contact/EntityContactRow';
import { Button } from '@/components/ui/button';
import type { EntityContact } from '@/types';

type CockpitSelectedContactCardProps = {
  contact: EntityContact;
  onClear: () => void;
};

const CockpitSelectedContactCard = ({
  contact,
  onClear
}: CockpitSelectedContactCardProps) => {
  return (
    <EntityContactRow
      contact={contact}
      variant="selected"
      actions={(
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onClear}
          className="size-7 text-muted-foreground hover:text-foreground"
          aria-label="Changer le contact sélectionné"
          title="Changer"
        >
          <RotateCcw size={13} aria-hidden="true" />
        </Button>
      )}
    />
  );
};

export default CockpitSelectedContactCard;
