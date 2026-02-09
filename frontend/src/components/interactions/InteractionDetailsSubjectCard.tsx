import { FileText } from 'lucide-react';

import type { Interaction } from '@/types';

type InteractionDetailsSubjectCardProps = {
  interaction: Interaction;
};

const InteractionDetailsSubjectCard = ({ interaction }: InteractionDetailsSubjectCardProps) => (
  <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 mb-8">
    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 block">
      Sujet Initial
    </span>
    <p className="text-slate-800 font-medium text-lg leading-snug">{interaction.subject}</p>
    {interaction.order_ref && (
      <div className="mt-2 inline-flex items-center gap-2 bg-white px-2 py-1 rounded border border-slate-200 text-xs font-mono text-slate-600">
        <FileText size={12} /> #{interaction.order_ref}
      </div>
    )}
  </div>
);

export default InteractionDetailsSubjectCard;
