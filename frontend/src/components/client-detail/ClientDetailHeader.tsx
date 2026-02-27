import { Archive, ArchiveRestore, Building2, Pencil } from 'lucide-react';

import { formatClientNumber } from '@/utils/clients/formatClientNumber';
import { Button } from '@/components/ui/button';
import type { ClientDetailHeaderProps } from './ClientDetailPanel.types';

const ClientDetailHeader = ({
  client,
  agencyName,
  isArchived,
  onEditClient,
  onToggleArchive
}: ClientDetailHeaderProps) => (
  <div className="flex items-start justify-between gap-4">
    <div className="flex items-start gap-4">
      <div className="w-12 h-12 rounded-lg bg-muted border border-border flex items-center justify-center text-muted-foreground">
        <Building2 size={20} />
      </div>
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground/80">
          {formatClientNumber(client.client_number)} · {client.account_type === 'cash' ? 'Comptant' : 'Compte a terme'}
        </p>
        <h2 className="text-lg font-semibold text-foreground">{client.name}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {client.address}, {client.postal_code} {client.city}
        </p>
        <p className="text-xs text-muted-foreground/80 mt-1">Agence: {agencyName}</p>
      </div>
    </div>
    <div className="flex items-center gap-2">
      <Button type="button" variant="outline" className="h-8 px-2" onClick={onEditClient}>
        <Pencil size={14} />
      </Button>
      <Button
        type="button"
        variant="outline"
        className="h-8 px-2"
        onClick={() => onToggleArchive(!isArchived)}
      >
        {isArchived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
      </Button>
    </div>
  </div>
);

export default ClientDetailHeader;
