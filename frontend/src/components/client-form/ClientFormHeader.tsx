import { Building2 } from 'lucide-react';

type ClientFormHeaderProps = {
  isEdit: boolean;
};

/**
 * Minimal header bar for the client form dialog.
 * Uses a compact pill-like layout with a monospace title.
 */
const ClientFormHeader = ({ isEdit }: ClientFormHeaderProps) => (
  <div className="px-6 py-3.5 border-b border-neutral-100/80 bg-white flex items-center gap-2.5">
    <div className="flex items-center justify-center h-6 w-6 rounded-md bg-neutral-100/80">
      <Building2 className="h-3.5 w-3.5 text-neutral-500 stroke-[1.5]" />
    </div>
    <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-600">
      {isEdit ? 'Modifier le client' : 'Nouveau client'}
    </h3>
  </div>
);

export default ClientFormHeader;
