
import React, { useState, useEffect, useRef } from 'react';
import { Interaction, TimelineEvent } from '../types';
import { X, Send, Clock, FileText, CheckCircle2, MessageSquare, Paperclip, ChevronDown, User, ArrowRight, Hash } from 'lucide-react';
import { getStoredStatuses } from '../services/configService';

interface Props {
  interaction: Interaction;
  onClose: () => void;
  onUpdate: (id: string, event: TimelineEvent, updates?: Partial<Interaction>) => void;
}

const InteractionDetails: React.FC<Props> = ({ interaction, onClose, onUpdate }) => {
  const [note, setNote] = useState('');
  const [status, setStatus] = useState(interaction.status);
  const [reminder, setReminder] = useState(interaction.reminder_at || '');
  const [orderRef, setOrderRef] = useState(interaction.order_ref || '');
  
  const [statuses, setStatuses] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setStatuses(getStoredStatuses());
  }, []);

  // Sync internal state when the interaction prop updates (e.g. after a successful save)
  useEffect(() => {
    setStatus(interaction.status);
    setReminder(interaction.reminder_at || '');
    setOrderRef(interaction.order_ref || '');
    // We don't clear the note here automatically to avoid losing draft if unrelated update happens, 
    // but typically update happens on submit so we clear it in handleSubmit.
  }, [interaction]);

  // Scroll to bottom of timeline on open/update
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [interaction.timeline]);

  const handleSubmit = () => {
    const safeReminder = interaction.reminder_at || '';
    const safeOrderRef = interaction.order_ref || '';
    
    // Check for changes
    if (!note.trim() && 
        status === interaction.status && 
        reminder === safeReminder && 
        orderRef === safeOrderRef) return;

    const events: TimelineEvent[] = [];
    const now = new Date().toISOString();
    const updates: Partial<Interaction> = {};

    // 1. Order Ref Change
    if (orderRef !== safeOrderRef) {
      events.push({
        id: Date.now() + 'or',
        date: now,
        type: 'order_ref_change',
        content: `N° Dossier : ${safeOrderRef || 'Aucun'} ➔ ${orderRef}`,
        author: 'Moi'
      });
      updates.order_ref = orderRef;
    }

    // 2. Status Change
    if (status !== interaction.status) {
      events.push({
        id: Date.now() + 'st',
        date: now,
        type: 'status_change',
        content: `Statut modifié : ${interaction.status} ➔ ${status}`,
        author: 'Moi'
      });
      updates.status = status;
    }

    // 3. Reminder Change
    if (reminder !== safeReminder) {
       const prettyDate = reminder ? new Date(reminder).toLocaleDateString() + ' ' + new Date(reminder).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : 'Aucun';
       events.push({
        id: Date.now() + 'rm',
        date: now,
        type: 'reminder_change',
        content: `Rappel mis à jour : ${prettyDate}`,
        author: 'Moi'
       });
       updates.reminder_at = reminder;
    }

    // 4. Note
    if (note.trim()) {
      events.push({
        id: Date.now() + 'nt',
        date: now,
        type: 'note',
        content: note,
        author: 'Moi'
      });
    }

    // Execute updates
    if (events.length > 0) {
        events.forEach((evt, idx) => {
          const isLast = idx === events.length - 1;
          onUpdate(interaction.id, evt, isLast ? updates : undefined);
        });
        setNote('');
    }
  };

  const getEventIcon = (type: string) => {
    switch(type) {
      case 'creation': return <CheckCircle2 size={14} className="text-emerald-500" />;
      case 'status_change': return <ArrowRight size={14} className="text-blue-500" />;
      case 'reminder_change': return <Clock size={14} className="text-orange-500" />;
      case 'order_ref_change': return <Hash size={14} className="text-purple-500" />;
      case 'note': return <MessageSquare size={14} className="text-slate-500" />;
      default: return <div className="w-2 h-2 rounded-full bg-slate-300" />;
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full md:w-[600px] bg-white shadow-2xl z-40 transform transition-transform duration-300 ease-in-out border-l border-slate-200 flex flex-col">
      
      {/* HEADER */}
      <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-start shrink-0">
        <div>
          <h2 className="text-lg font-bold text-slate-800">{interaction.company_name}</h2>
          <div className="flex flex-col text-sm text-slate-500 mt-1">
             <span className="font-medium text-slate-700">{interaction.contact_name}</span>
             <span className="font-mono text-xs">{interaction.contact_phone}</span>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-600 uppercase tracking-wider">{interaction.entity_type}</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-500">{interaction.contact_service}</span>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
          <X size={20} />
        </button>
      </div>

      {/* BODY - SCROLLABLE TIMELINE */}
      <div className="flex-1 overflow-y-auto p-6 bg-white" ref={scrollRef}>
        
        {/* Subject Card */}
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 mb-8">
           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Sujet Initial</span>
           <p className="text-slate-800 font-medium text-lg leading-snug">{interaction.subject}</p>
           {interaction.order_ref && (
             <div className="mt-2 inline-flex items-center gap-2 bg-white px-2 py-1 rounded border border-slate-200 text-xs font-mono text-slate-600">
               <FileText size={12} /> #{interaction.order_ref}
             </div>
           )}
        </div>

        {/* Timeline */}
        <div className="relative border-l-2 border-slate-100 ml-4 space-y-8 pb-4">
           {interaction.timeline.map((event) => (
             <div key={event.id} className="relative pl-8 group">
                <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center">
                  {getEventIcon(event.type)}
                </div>
                <div className="flex flex-col gap-1">
                   <div className="flex items-center gap-2">
                     <span className="text-[11px] font-bold text-slate-500">
                       {new Date(event.date).toLocaleDateString()} <span className="font-normal opacity-75">{new Date(event.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                     </span>
                     <span className="text-[10px] text-slate-300">•</span>
                     <span className="text-[10px] font-medium text-slate-400">{event.author || 'Moi'}</span>
                   </div>
                   
                   <div className={`text-sm ${
                     event.type === 'note' ? 'text-slate-800 bg-blue-50/50 p-3 rounded-md border border-blue-50' : 
                     event.type === 'status_change' ? 'text-slate-600 italic' : 
                     event.type === 'order_ref_change' ? 'text-purple-700 font-medium bg-purple-50 p-2 rounded border border-purple-100' :
                     'text-slate-600'
                   }`}>
                     {event.content}
                   </div>
                </div>
             </div>
           ))}
        </div>

      </div>

      {/* FOOTER - ACTION AREA */}
      <div className="bg-slate-50 border-t border-slate-200 p-4 shrink-0">
         
         {/* Action Rows */}
         <div className="grid grid-cols-12 gap-3 mb-4">
            
            {/* STATUS */}
            <div className="col-span-4">
               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Nouveau Statut</label>
               <div className="relative">
                 <select 
                   value={status} 
                   onChange={(e) => setStatus(e.target.value)}
                   className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-md py-2 pl-2 pr-6 focus:border-cir-red focus:outline-none appearance-none truncate"
                 >
                   {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                 </select>
                 <ChevronDown size={14} className="absolute right-2 top-2.5 text-slate-400 pointer-events-none" />
               </div>
            </div>

            {/* REMINDER */}
            <div className="col-span-5">
               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Prochain Rappel</label>
               <input 
                 type="datetime-local" 
                 value={reminder}
                 onChange={(e) => setReminder(e.target.value)}
                 className="w-full text-xs bg-white border border-slate-300 rounded-md py-1.5 px-2 focus:border-cir-red focus:outline-none"
               />
            </div>

            {/* ORDER REF */}
            <div className="col-span-3">
               <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">N° Devis / Cmd</label>
               <div className="relative">
                 <input 
                   type="text" 
                   value={orderRef}
                   onChange={(e) => setOrderRef(e.target.value)}
                   placeholder="..."
                   className="w-full text-xs font-mono bg-white border border-slate-300 rounded-md py-1.5 pl-7 px-2 focus:border-cir-red focus:outline-none"
                 />
                 <Hash size={12} className="absolute left-2 top-2 text-slate-400" />
               </div>
            </div>

         </div>

         {/* NOTE INPUT */}
         <div className="relative">
           <textarea 
             value={note}
             onChange={(e) => setNote(e.target.value)}
             placeholder="Ajouter une note de suivi, compte-rendu d'appel..."
             className="w-full bg-white border border-slate-300 rounded-lg p-3 pr-12 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 focus:outline-none resize-none h-24 shadow-sm"
             onKeyDown={(e) => { if(e.ctrlKey && e.key === 'Enter') handleSubmit(); }}
           />
           <div className="absolute bottom-3 right-3 flex gap-2">
              <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors" title="Joindre un fichier (Simulation)">
                <Paperclip size={18} />
              </button>
              <button 
                onClick={handleSubmit}
                disabled={!note.trim() && status === interaction.status && reminder === (interaction.reminder_at || '') && orderRef === (interaction.order_ref || '')}
                className="bg-cir-red text-white p-2 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                <Send size={16} />
              </button>
           </div>
         </div>
         <div className="text-[10px] text-slate-400 mt-2 text-right">
           <span className="font-bold">Ctrl + Enter</span> pour envoyer
         </div>
      </div>

    </div>
  );
};

export default InteractionDetails;
