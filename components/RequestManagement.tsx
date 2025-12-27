
import React from 'react';
import { LeaveRequest } from '../types';

interface RequestManagementProps {
  requests: LeaveRequest[];
  onAction: (id: string, action: 'approved' | 'rejected') => void;
}

const RequestManagement: React.FC<RequestManagementProps> = ({ requests, onAction }) => {
  const pending = requests.filter(r => r.status === 'pending');

  if (pending.length === 0) return (
    <div className="p-8 bg-gray-50 rounded-[2.5rem] border border-dashed border-gray-200 text-center">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nessuna richiesta in attesa</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 bg-amber-600 rounded-full animate-pulse"></div>
        <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-900">Richieste dello Staff</h3>
      </div>
      <div className="grid gap-6">
        {pending.map(req => {
          const isRevocation = req.type === 'availability_change';
          return (
            <div key={req.id} className={`bg-white p-8 rounded-[3rem] border ${isRevocation ? 'border-amber-200 bg-amber-50/20' : 'border-gray-50'} shadow-sm flex flex-col md:flex-row items-center justify-between gap-8 animate-in slide-in-from-top-4`}>
              <div className="flex items-center gap-8">
                <div className={`w-16 h-16 ${isRevocation ? 'bg-amber-600' : 'bg-gray-900'} text-white rounded-[1.5rem] flex items-center justify-center shadow-lg`}>
                  <i className={`fas ${isRevocation ? 'fa-undo-alt' : req.type === 'vacation' ? 'fa-plane' : 'fa-user-clock'} text-xl`}></i>
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h5 className="font-bold text-lg text-gray-900">{req.member_name}</h5>
                    <span className={`px-3 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest ${isRevocation ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                      {isRevocation ? 'Richiesta Revoca' : req.type}
                    </span>
                  </div>
                  <p className="text-xs font-luxury text-gray-500">
                    Per il giorno <strong>{new Date(req.start_date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}</strong>
                  </p>
                  {req.notes && (
                    <div className="mt-2 p-3 bg-gray-50 rounded-xl border-l-4 border-amber-600">
                      <p className="text-[10px] text-gray-600 italic leading-relaxed">"{req.notes}"</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-4 w-full md:w-auto">
                <button 
                  onClick={() => onAction(req.id, 'rejected')} 
                  className="flex-1 px-8 py-4 bg-white border border-red-100 text-red-600 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-red-50 transition-all"
                >
                  Rifiuta
                </button>
                <button 
                  onClick={() => onAction(req.id, 'approved')} 
                  className="flex-[2] px-10 py-4 bg-black text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-amber-600 transition-all shadow-xl"
                >
                  {isRevocation ? 'Approva Revoca' : 'Approva'}
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
