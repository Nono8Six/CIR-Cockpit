import React, { useState, useMemo, useEffect } from 'react';
import { Interaction, Channel, TimelineEvent } from '../types';
import InteractionCard from './InteractionCard';
import InteractionDetails from './InteractionDetails';
import { 
  LayoutList, Columns,
  Search,
  Phone, Mail, Store, Car, Filter
} from 'lucide-react';
import { getStoredStatuses } from '../services/configService';
import { addTimelineEvent } from '../services/interactionService';

interface DashboardProps {
  interactions: Interaction[];
  onDataChange: (message?: string) => void;
}

type ViewMode = 'kanban' | 'list';
type FilterPeriod = 'today' | 'yesterday' | 'last7' | 'thisMonth' | 'lastMonth' | 'custom';

const Dashboard: React.FC<DashboardProps> = ({ interactions, onDataChange }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [searchTerm, setSearchTerm] = useState('');
  const [statuses, setStatuses] = useState<string[]>([]);
  const [selectedInteraction, setSelectedInteraction] = useState<Interaction | null>(null);

  // Date Filtering State
  const [period, setPeriod] = useState<FilterPeriod>('today');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    setStatuses(getStoredStatuses());
  }, [interactions]);

  // Handle Period Presets
  useEffect(() => {
    const today = new Date();
    const start = new Date(today);
    const end = new Date(today);

    switch (period) {
      case 'today':
        break;
      case 'yesterday':
        start.setDate(today.getDate() - 1);
        end.setDate(today.getDate() - 1);
        break;
      case 'last7':
        start.setDate(today.getDate() - 6);
        break;
      case 'thisMonth':
        start.setDate(1);
        break;
      case 'lastMonth':
        start.setMonth(today.getMonth() - 1);
        start.setDate(1);
        end.setDate(0); 
        break;
      case 'custom':
        return;
    }

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  }, [period]);

  // Handle updates from the details panel
  const handleInteractionUpdate = (id: string, event: TimelineEvent, updates?: Partial<Interaction>) => {
    addTimelineEvent(id, event, updates);
    
    // Update local selected state for immediate feedback in the panel
    if (selectedInteraction && selectedInteraction.id === id) {
       setSelectedInteraction(prev => prev ? ({
         ...prev,
         ...updates,
         timeline: [...prev.timeline, event]
       }) : null);
    }

    // Notify App to refresh global state and show toast
    // We debounce slightly or just trigger it. Since addTimelineEvent is sync, it's fine.
    // If updates contains status, we might want a specific message.
    let msg = "Dossier mis à jour";
    if (updates?.status) msg = `Statut changé : ${updates.status}`;
    else if (updates?.order_ref) msg = "N° de dossier enregistré";
    else if (event.type === 'note') msg = "Note ajoutée";

    onDataChange(msg);
  };

  // --- HELPERS ---
  const getChannelIcon = (channel: string) => {
    switch(channel) {
      case Channel.PHONE: return <Phone size={14} className="text-slate-600" />;
      case Channel.EMAIL: return <Mail size={14} className="text-slate-600" />;
      case Channel.COUNTER: return <Store size={14} className="text-slate-600" />;
      case Channel.VISIT: return <Car size={14} className="text-slate-600" />;
      default: return <Phone size={14} />;
    }
  };

  const isStatusDone = (s: string) => {
    const lower = s.toLowerCase();
    return lower.includes('clos') || lower.includes('gagné') || lower.includes('perdu') || lower.includes('terminé');
  };

  const isStatusTodo = (s: string) => {
    return statuses.length > 0 && s === statuses[0];
  };

  // --- FILTERING LOGIC ---
  const filteredData = useMemo(() => {
    let data = interactions;

    // 1. Text Search
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      data = data.filter(i => 
        i.company_name.toLowerCase().includes(lowerTerm) ||
        i.contact_name.toLowerCase().includes(lowerTerm) ||
        i.subject.toLowerCase().includes(lowerTerm) ||
        (i.order_ref && i.order_ref.includes(lowerTerm)) ||
        i.contact_phone.includes(lowerTerm) ||
        i.mega_families.some(f => f.toLowerCase().includes(lowerTerm))
      );
    }

    // 2. Date Filter
    const sDate = new Date(startDate);
    sDate.setHours(0, 0, 0, 0);
    const eDate = new Date(endDate);
    eDate.setHours(23, 59, 59, 999);

    if (viewMode === 'list') {
      data = data.filter(i => {
        const d = new Date(i.created_at);
        return d >= sDate && d <= eDate;
      });
      data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else {
      data = data.filter(i => {
        const isClosed = isStatusDone(i.status);
        if (!isClosed) return true; 
        const d = new Date(i.created_at);
        return d >= sDate && d <= eDate;
      });
    }

    return data;
  }, [interactions, searchTerm, startDate, endDate, viewMode, statuses]);

  const kanbanColumns = useMemo(() => {
    if (viewMode === 'list') return null;
    return {
      urgencies: filteredData.filter(i => {
         const isTodo = isStatusTodo(i.status);
         const isLate = i.reminder_at && new Date(i.reminder_at) < new Date() && !isStatusDone(i.status);
         return isTodo || isLate;
      }),
      inProgress: filteredData.filter(i => {
         const isTodo = isStatusTodo(i.status);
         const isDone = isStatusDone(i.status);
         const isLate = i.reminder_at && new Date(i.reminder_at) < new Date();
         return !isTodo && !isDone && !isLate;
      }),
      completed: filteredData.filter(i => isStatusDone(i.status))
    };
  }, [filteredData, viewMode, statuses]);

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden relative">
      
      {/* TOOLBAR */}
      <div className="bg-white border-b border-slate-200 p-3 flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center shrink-0">
        <div className="flex bg-slate-100 rounded-md p-1 gap-1 shrink-0">
           <button onClick={() => setViewMode('kanban')} className={`flex items-center gap-2 px-3 py-1.5 rounded-sm text-xs font-bold transition-all ${viewMode === 'kanban' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
             <Columns size={14} /> TABLEAU
           </button>
           <button onClick={() => setViewMode('list')} className={`flex items-center gap-2 px-3 py-1.5 rounded-sm text-xs font-bold transition-all ${viewMode === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
             <LayoutList size={14} /> HISTORIQUE
           </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2 bg-slate-50 border border-slate-200 rounded-md p-1">
           <div className="flex items-center gap-2 px-2">
             <Filter size={14} className="text-slate-400" />
             <select value={period} onChange={(e) => setPeriod(e.target.value as FilterPeriod)} className="bg-transparent text-sm font-medium text-slate-700 focus:outline-none cursor-pointer">
               <option value="today">Aujourd'hui</option>
               <option value="yesterday">Hier</option>
               <option value="last7">7 derniers jours</option>
               <option value="thisMonth">Mois en cours</option>
               <option value="lastMonth">Mois dernier</option>
               <option value="custom">Période personnalisée</option>
             </select>
           </div>
           <div className="h-4 w-px bg-slate-300 hidden sm:block"></div>
           <div className="flex items-center gap-2">
             <input type="date" value={startDate} onChange={(e) => { setPeriod('custom'); setStartDate(e.target.value); }} className="bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-600 focus:outline-none focus:border-blue-400" />
             <span className="text-slate-400 text-xs">à</span>
             <input type="date" value={endDate} onChange={(e) => { setPeriod('custom'); setEndDate(e.target.value); }} className="bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-600 focus:outline-none focus:border-blue-400" />
           </div>
        </div>

        <div className="relative w-full md:w-64 group">
           <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-600 transition-colors" />
           <input type="text" placeholder="Filtrer par nom, sujet, réf..." className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-md text-sm focus:ring-1 focus:ring-slate-300 focus:border-slate-300 focus:outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 overflow-hidden p-0 relative bg-slate-50">
        
        {viewMode === 'kanban' && kanbanColumns && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full p-6 overflow-hidden">
            <div className="flex flex-col h-full bg-slate-100/50 rounded-lg border border-slate-200/60 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 flex justify-between items-center bg-white">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 text-xs uppercase tracking-wider"><span className="w-2 h-2 rounded-full bg-red-500"></span> À Traiter / Urgent</h3>
                <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-200">{kanbanColumns.urgencies.length}</span>
              </div>
              <div className="p-3 overflow-y-auto flex-1 scrollbar-hide space-y-3">
                {kanbanColumns.urgencies.map(i => <div key={i.id} onClick={() => setSelectedInteraction(i)}><InteractionCard data={i} /></div>)}
                {kanbanColumns.urgencies.length === 0 && <div className="text-center py-10 text-slate-400 text-sm">Tout est à jour.</div>}
              </div>
            </div>

            <div className="flex flex-col h-full bg-slate-100/50 rounded-lg border border-slate-200/60 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 flex justify-between items-center bg-white">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 text-xs uppercase tracking-wider"><span className="w-2 h-2 rounded-full bg-orange-400"></span> En Cours / Attente</h3>
                <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-200">{kanbanColumns.inProgress.length}</span>
              </div>
              <div className="p-3 overflow-y-auto flex-1 scrollbar-hide space-y-3">
                {kanbanColumns.inProgress.map(i => <div key={i.id} onClick={() => setSelectedInteraction(i)}><InteractionCard data={i} /></div>)}
                {kanbanColumns.inProgress.length === 0 && <div className="text-center py-10 text-slate-400 text-sm">Aucun dossier en attente.</div>}
              </div>
            </div>

            <div className="flex flex-col h-full bg-slate-100/50 rounded-lg border border-slate-200/60 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 flex justify-between items-center bg-white">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 text-xs uppercase tracking-wider"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Terminés (Période)</h3>
                <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-200">{kanbanColumns.completed.length}</span>
              </div>
              <div className="p-3 overflow-y-auto flex-1 scrollbar-hide space-y-3">
                {kanbanColumns.completed.map(i => <div key={i.id} onClick={() => setSelectedInteraction(i)}><InteractionCard data={i} /></div>)}
                {kanbanColumns.completed.length === 0 && <div className="text-center py-10 text-slate-400 text-sm">Rien terminé sur cette période.</div>}
              </div>
            </div>
          </div>
        )}

        {viewMode === 'list' && (
          <div className="h-full overflow-auto p-6">
             <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
               <table className="w-full text-left border-collapse">
                 <thead className="bg-slate-50 sticky top-0 z-10 text-[11px] uppercase text-slate-500 font-bold tracking-wider">
                   <tr>
                     <th className="px-6 py-3 border-b border-slate-200 w-32">Date</th>
                     <th className="px-6 py-3 border-b border-slate-200 w-16 text-center">Canal</th>
                     <th className="px-6 py-3 border-b border-slate-200 w-32">Statut</th>
                     <th className="px-6 py-3 border-b border-slate-200">Client / Contact</th>
                     <th className="px-6 py-3 border-b border-slate-200">Sujet</th>
                     <th className="px-6 py-3 border-b border-slate-200 w-32 text-right">Ref</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {filteredData.length === 0 ? (
                     <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-sm">Aucune interaction trouvée.</td></tr>
                   ) : (
                     filteredData.map(item => (
                       <tr key={item.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => setSelectedInteraction(item)}>
                         <td className="px-6 py-3 text-sm font-medium text-slate-500">
                           <div className="flex flex-col">
                              <span>{new Date(item.created_at).toLocaleDateString()}</span>
                              <span className="text-xs text-slate-400">{new Date(item.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                           </div>
                         </td>
                         <td className="px-6 py-3 text-center"><div className="flex justify-center items-center">{getChannelIcon(item.channel)}</div></td>
                         <td className="px-6 py-3">
                           <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase whitespace-nowrap border ${isStatusTodo(item.status) ? 'bg-red-50 text-red-700 border-red-100' : isStatusDone(item.status) ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-orange-50 text-orange-700 border-orange-100'}`}>{item.status}</span>
                         </td>
                         <td className="px-6 py-3">
                           <div className="flex flex-col">
                             <span className="font-semibold text-slate-900 text-sm truncate max-w-[200px]" title={item.company_name}>{item.company_name || 'Particulier'}</span>
                             <span className="text-xs text-slate-500">{item.contact_name} {item.contact_phone && `• ${item.contact_phone}`}</span>
                           </div>
                         </td>
                         <td className="px-6 py-3">
                           <div className="flex flex-col gap-1">
                             <span className="text-sm text-slate-700 font-medium truncate max-w-[300px]">{item.subject}</span>
                             <div className="flex gap-1">
                               {item.mega_families.slice(0, 2).map(f => (<span key={f} className="text-[9px] px-1.5 py-0.5 bg-white border border-slate-200 text-slate-500 rounded uppercase">{f}</span>))}
                               {item.mega_families.length > 2 && <span className="text-[9px] text-slate-400">+{item.mega_families.length - 2}</span>}
                             </div>
                           </div>
                         </td>
                         <td className="px-6 py-3 text-right">
                           {item.order_ref && (<div className="flex justify-end"><span className="flex items-center gap-1 text-xs font-mono text-slate-600 bg-slate-100 px-2 py-1 rounded border border-slate-200">#{item.order_ref}</span></div>)}
                         </td>
                       </tr>
                     ))
                   )}
                 </tbody>
               </table>
             </div>
          </div>
        )}

      </div>

      {/* DETAILS SLIDE-OVER */}
      {selectedInteraction && (
        <>
          <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-30 transition-opacity" onClick={() => setSelectedInteraction(null)} />
          <InteractionDetails 
            interaction={selectedInteraction} 
            onClose={() => setSelectedInteraction(null)}
            onUpdate={handleInteractionUpdate}
          />
        </>
      )}

    </div>
  );
};

export default Dashboard;