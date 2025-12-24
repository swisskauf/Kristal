
import React from 'react';
import { LeaveRequest } from '../types';

interface RequestManagementProps {
  requests: LeaveRequest[];
  onAction: (id: string, action: 'approved' | 'rejected') => void;
}

const RequestManagement: React.FC<RequestManagementProps> = ({ requests, onAction }) => {
  const pending = requests.filter(r => r.status === 'pending');

  if (pending.length === 0) return null;

  return (
    <div className="space-y-6">
      <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-600">Richieste in Attesa</h3>
      <div className="grid gap-4">
        {pending.map(req => (
          <div key={req.id} className="bg-white p-6 rounded-[2.5rem] border border-amber-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 animate-in slide-in-from-top-2">
            <div className="flex items-center gap-6">
              <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center">
                <i className={`fas ${req.type === 'vacation' ? 'fa-plane' : 'fa-clock'} text-amber-600`}></i>
              </div>
              <div>
                <h5 className="font-bold text-sm">{req.member_name} — <span className="uppercase text-amber-600 text-[9px]">{req.type}</span></h5>
                <p className="text-[11px] font-luxury">Dal {new Date(req.start_date).toLocaleDateString()} al {new Date(req.end_date).toLocaleDateString()}</p>
                {req.notes && <p className="text-[9px] text-gray-400 italic mt-1">"{req.notes}"</p>}
              </div>
            </div>
            <div className="flex gap-3 w-full md:w-auto">
              <button onClick={() => onAction(req.id, 'rejected')} className="flex-1 px-6 py-3 border border-red-100 text-red-500 rounded-xl text-[9px] font-bold uppercase tracking-widest hover:bg-red-50 transition-all">Rifiuta</button>
              <button onClick={() => onAction(req.id, 'approved')} className="flex-[2] px-6 py-3 bg-black text-white rounded-xl text-[9px] font-bold uppercase tracking-widest hover:bg-green-600 transition-all">Approva</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RequestManagement;
