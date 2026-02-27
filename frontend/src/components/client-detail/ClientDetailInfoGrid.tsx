import type { Client } from '@/types';

type ClientDetailInfoGridProps = {
  client: Client;
};

const ClientDetailInfoGrid = ({ client }: ClientDetailInfoGridProps) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div className="rounded-md border border-border p-3 text-sm text-muted-foreground">
      <p className="text-xs uppercase tracking-widest text-muted-foreground/80">SIRET</p>
      <p className="mt-1 font-medium">{client.siret ?? 'Non renseigne'}</p>
    </div>
    <div className="rounded-md border border-border p-3 text-sm text-muted-foreground">
      <p className="text-xs uppercase tracking-widest text-muted-foreground/80">Notes</p>
      <p className="mt-1 font-medium">{client.notes || 'Aucune note'}</p>
    </div>
  </div>
);

export default ClientDetailInfoGrid;
