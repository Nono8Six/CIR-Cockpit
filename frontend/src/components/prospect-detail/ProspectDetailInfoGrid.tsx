import type { Entity } from '@/types';

type ProspectDetailInfoGridProps = {
  prospect: Entity;
};

const ProspectDetailInfoGrid = ({ prospect }: ProspectDetailInfoGridProps) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div className="rounded-md border border-slate-200 p-3 text-sm text-slate-600">
      <p className="text-xs uppercase tracking-widest text-slate-400">SIRET</p>
      <p className="mt-1 font-medium">{prospect.siret ?? 'Non renseigne'}</p>
    </div>
    <div className="rounded-md border border-slate-200 p-3 text-sm text-slate-600">
      <p className="text-xs uppercase tracking-widest text-slate-400">Notes</p>
      <p className="mt-1 font-medium">{prospect.notes || 'Aucune note'}</p>
    </div>
  </div>
);

export default ProspectDetailInfoGrid;
