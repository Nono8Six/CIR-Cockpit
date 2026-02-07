import { X } from 'lucide-react';

import type { Interaction } from '@/types';

type InteractionDetailsHeaderProps = {
  interaction: Interaction;
  canConvert: boolean;
  onRequestConvert: (interaction: Interaction) => void;
  onClose: () => void;
};

const InteractionDetailsHeader = ({
  interaction,
  canConvert,
  onRequestConvert,
  onClose
}: InteractionDetailsHeaderProps) => (
  <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-start shrink-0">
    <div>
      <h2 className="text-lg font-bold text-slate-800">{interaction.company_name}</h2>
      <div className="flex flex-col text-sm text-slate-500 mt-1">
        <span className="font-medium text-slate-700">{interaction.contact_name}</span>
        <span className="font-mono text-xs">
          {interaction.contact_phone ?? interaction.contact_email ?? ''}
        </span>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-600 uppercase tracking-wider">
          {interaction.entity_type}
        </span>
        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100">
          {interaction.interaction_type}
        </span>
        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-500">
          {interaction.contact_service}
        </span>
        {canConvert && (
          <button
            type="button"
            onClick={() => onRequestConvert(interaction)}
            className="text-xs font-semibold px-2 py-0.5 rounded border border-cir-red/30 text-cir-red bg-white hover:bg-cir-red/5 transition-colors"
          >
            Convertir en client
          </button>
        )}
      </div>
    </div>
    <button
      type="button"
      onClick={onClose}
      className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cir-red/30"
      aria-label="Fermer le panneau"
    >
      <X size={20} />
    </button>
  </div>
);

export default InteractionDetailsHeader;
