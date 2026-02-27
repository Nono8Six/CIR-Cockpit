import { ArrowRightLeft, Building2, Pencil } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { ProspectDetailHeaderProps } from './ProspectDetailPanel.types';

const ProspectDetailHeader = ({
  prospect,
  agencyName,
  addressLine,
  onRequestConvert,
  onEditProspect
}: ProspectDetailHeaderProps) => (
  <div className="flex items-start justify-between gap-4">
    <div className="flex items-start gap-4">
      <div className="w-12 h-12 rounded-lg bg-muted border border-border flex items-center justify-center text-muted-foreground">
        <Building2 size={20} />
      </div>
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground/80">
          {prospect.entity_type || 'Prospect'}
        </p>
        <h2 className="text-lg font-semibold text-foreground">{prospect.name}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {addressLine || 'Adresse non renseignee'}
        </p>
        <p className="text-xs text-muted-foreground/80 mt-1">Agence: {agencyName}</p>
      </div>
    </div>
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        className="h-8 px-2"
        onClick={onEditProspect}
        aria-label="Modifier le prospect"
      >
        <Pencil size={14} />
      </Button>
      <Button
        type="button"
        className="h-8 px-3 text-xs"
        onClick={() =>
          onRequestConvert({
            id: prospect.id,
            name: prospect.name,
            client_number: prospect.client_number ?? null,
            account_type: prospect.account_type ?? null
          })
        }
      >
        <ArrowRightLeft size={14} className="mr-1" /> Convertir en client
      </Button>
    </div>
  </div>
);

export default ProspectDetailHeader;
