
import React from 'react';
import { Interaction } from '../types';
import { Phone, Mail, Store, Car, Clock, FileText } from 'lucide-react';

interface Props {
  data: Interaction;
}

const getChannelIcon = (channel: string) => {
  switch(channel) {
    case 'Téléphone': return <Phone size={12} />;
    case 'Email': return <Mail size={12} />;
    case 'Comptoir': return <Store size={12} />;
    case 'Visite': return <Car size={12} />;
    default: return <Phone size={12} />;
  }
};

const InteractionCard: React.FC<Props> = ({ data }) => {
  const isDone = data.status.toLowerCase().includes('clos') || data.status.toLowerCase().includes('gagné') || data.status.toLowerCase().includes('terminé');
  const isLate = data.reminder_at && new Date(data.reminder_at) < new Date() && !isDone;
  
  // Status Border Color Heuristic
  let statusClass = "border-l-orange-400"; // Default pending
  
  if (data.status.toLowerCase().includes('traiter') || isLate) {
      statusClass = "border-l-red-500";
  } else if (isDone) {
      statusClass = "border-l-emerald-500 opacity-60 hover:opacity-100";
  } else if (data.status.toLowerCase().includes('perdu')) {
      statusClass = "border-l-slate-400 opacity-60 hover:opacity-100";
  }

  return (
    <div className={`p-3 rounded-md shadow-sm border border-slate-200 bg-white hover:shadow-md transition-all group border-l-[3px] ${statusClass} cursor-pointer hover:border-slate-300 relative`}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
           <span className="w-5 h-5 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 border border-slate-200">
             {getChannelIcon(data.channel)}
           </span>
           <span className="text-xs font-bold text-slate-700 truncate max-w-[120px]" title={data.company_name}>
             {data.company_name || 'Particulier'}
           </span>
        </div>
        <span className="text-[10px] text-slate-400 font-medium">
          {new Date(data.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
        </span>
      </div>

      <div className="mb-2.5">
        <p className="font-semibold text-sm text-slate-900 leading-snug">{data.subject}</p>
        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
          {data.contact_name} 
          {data.contact_phone && <span className="text-slate-300">|</span>} 
          {data.contact_phone}
        </p>
      </div>

      <div className="flex flex-wrap gap-1 mb-3">
        {data.mega_families.slice(0, 3).map(f => (
          <span key={f} className="text-[9px] px-1.5 py-0.5 bg-slate-50 border border-slate-100 text-slate-500 rounded font-medium uppercase tracking-tight">
            {f}
          </span>
        ))}
        {data.mega_families.length > 3 && <span className="text-[9px] px-1.5 py-0.5 text-slate-400">+{data.mega_families.length - 3}</span>}
      </div>

      <div className="flex justify-between items-center pt-2 border-t border-slate-50">
         <div className="flex items-center gap-2">
           {data.reminder_at && (
             <span className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${
               new Date(data.reminder_at) < new Date() && !isDone ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-500'
             }`}>
               <Clock size={10} />
               {new Date(data.reminder_at).toLocaleDateString()}
             </span>
           )}
           {data.order_ref && (
             <span className="flex items-center gap-1 text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded font-mono">
               <FileText size={10} />
               #{data.order_ref}
             </span>
           )}
         </div>
         
         <span className="text-[9px] text-slate-400 uppercase font-bold">{data.status}</span>
      </div>
    </div>
  );
};

export default InteractionCard;
