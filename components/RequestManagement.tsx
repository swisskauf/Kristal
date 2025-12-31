
import React from 'react';
import { LeaveRequest } from '../types';

interface RequestManagementProps {
  requests: LeaveRequest[];
  onAction: (id: string, action: 'approved' | 'rejected') => void;
}

const RequestManagement: React.FC<RequestManagementProps> = ({ requests, onAction }) => {
  const pending = requests.filter(r => r.status === 'pending');

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getDurationDays = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    const diffTime = Math.abs(e.getTime() - s.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 
    return diffDays;
  };

  if (pending.length === 0) return (
    <div className="p-8 bg-gray-50 rounded-[2.5rem] border border-dashed border-gray-200 text-center">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nessuna richiesta in attesa</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 bg-amber-600 rounded-full animate-pulse"></div>
        <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-900">Richieste dello Staff ({pending.length})</h3>
      </div>
      <div className="grid gap-6">
        {pending.map(req => {
          const isRevocation = req.type === 'availability_change';
          const duration = getDurationDays(req.start_date, req.end_date);
          
          return (
            <div key={req.id} className={`bg-white p-8 rounded-[3rem] border ${isRevocation ? 'border-amber-200 bg-amber-50/20' : 'border-gray-100'} shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-8 animate-in slide-in-from-top-4 hover:shadow-md transition-all`}>
              
              {/* Info Artista e Tipo */}
              <div className="flex items-start gap-6">
                <div className={`w-16 h-16 shrink-0 ${isRevocation ? 'bg-amber-600' : 'bg-gray-900'} text-white rounded-[1.5rem] flex items-center justify-center shadow-lg`}>
                  <i className={`fas ${isRevocation ? 'fa-undo-alt' : req.type === 'vacation' ? 'fa-plane' : 'fa-user-clock'} text-xl`}></i>
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h5 className="font-bold text-lg text-gray-900">{req.member_name}</h5>
                    <span className={`px-3 py-1 rounded-full text-[8px] font-bold uppercase tracking-widest ${isRevocation ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                      {isRevocation ? 'Richiesta Revoca' : req.type}
                    </span>
                  </div>
                  {req.notes && (
                    <p className="text-[11px] text-gray-500 italic max-w-md line-clamp-2">
                      Note: "{req.notes}"
                    </p>
                  )}
                </div>
              </div>

              {/* Date e Durata (Fix Layout: visibile chiaramente) */}
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-12 bg-gray-50 p-5 rounded-3xl border border-gray-100 xl:mx-auto w-full xl:w-auto">
                 <div>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Dal giorno</p>
                    <p className="text-sm font-bold text-gray-900 flex items-center gap-2">
                       <i className="fas fa-calendar-alt text-amber-600"></i> {formatDate(req.start_date)}
                    </p>
                    {!req.is_full_day && req.start_time && <p className="text-[10px] text-gray-500 font-bold mt-1">Ore {req.start_time}</p>}
                 </div>
                 <div className="hidden sm:block w-px bg-gray-200"></div>
                 <div>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Al giorno</p>
                    <p className="text-sm font-bold text-gray-900 flex items-center gap-2">
                       <i className="fas fa-flag-checkered text-gray-400"></i> {formatDate(req.end_date)}
                    </p>
                    {!req.is_full_day && req.end_time && <p className="text-[10px] text-gray-500 font-bold mt-1">Ore {req.end_time}</p>}
                 </div>
                 <div className="hidden sm:block w-px bg-gray-200"></div>
                 <div>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Durata</p>
                    <p className="text-sm font-bold text-gray-900">{duration} <span className="text-[10px] font-normal text-gray-500">gg</span></p>
                 </div>
              </div>

              {/* Azioni */}
              <div className="flex gap-3 w-full xl:w-auto shrink-0 pt-4 xl:pt-0 border-t xl:border-none border-gray-50">
                <button 
                  onClick={() => onAction(req.id, 'rejected')} 
                  className="flex-1 xl:flex-none px-6 py-4 bg-white border border-red-100 text-red-600 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-sm"
                >
                  <i className="fas fa-times mr-2"></i> Rifiuta
                </button>
                <button 
                  onClick={() => onAction(req.id, 'approved')} 
                  className="flex-[2] xl:flex-none px-8 py-4 bg-black text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-amber-600 transition-all shadow-xl"
                >
                  <i className="fas fa-check mr-2"></i> {isRevocation ? 'Approva Revoca' : 'Approva'}
                </button>
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RequestManagement;
