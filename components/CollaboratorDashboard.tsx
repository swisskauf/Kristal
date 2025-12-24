
import React, { useState, useMemo } from 'react';
import { TeamMember, Appointment, LeaveRequest } from '../types';

interface CollaboratorDashboardProps {
  member: TeamMember;
  appointments: Appointment[];
  requests: LeaveRequest[];
  onSendRequest: (req: any) => void;
  onUpdateProfile: (p: any) => void;
}

const CollaboratorDashboard: React.FC<CollaboratorDashboardProps> = ({ member, appointments, requests, onSendRequest, onUpdateProfile }) => {
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [newReq, setNewReq] = useState({ type: 'vacation', start: '', end: '', notes: '' });
  
  const myAppointments = useMemo(() => 
    appointments.filter(a => a.team_member_name === member.name).sort((a,b) => a.date.localeCompare(b.date)),
  [appointments, member]);

  const stats = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const month = now.getMonth();
    const year = now.getFullYear();

    const getRev = (appts: Appointment[]) => appts.reduce((acc, a) => acc + (a.services?.price || 0), 0);

    return {
      daily: getRev(myAppointments.filter(a => a.date.startsWith(todayStr))),
      monthly: getRev(myAppointments.filter(a => {
        const d = new Date(a.date);
        return d.getMonth() === month && d.getFullYear() === year;
      })),
      yearly: getRev(myAppointments.filter(a => new Date(a.date).getFullYear() === year)),
      vacationRemaining: (member.total_vacation_days || 25) - (member.absences_json?.filter(a => a.type === 'vacation').length || 0)
    };
  }, [myAppointments, member]);

  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    onSendRequest({
      type: newReq.type,
      start_date: newReq.start,
      end_date: newReq.end,
      notes: newReq.notes,
      status: 'pending'
    });
    setIsRequestModalOpen(false);
    setNewReq({ type: 'vacation', start: '', end: '', notes: '' });
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <p className="text-amber-600 text-[10px] font-bold uppercase tracking-[0.3em] mb-2">Workspace Artista</p>
          <h2 className="text-5xl font-luxury font-bold text-gray-900 tracking-tighter">Bentornato, {member.name}</h2>
        </div>
        <div className="flex gap-4">
          <button onClick={() => setIsRequestModalOpen(true)} className="px-8 py-4 bg-black text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-xl">Richiedi Congedo</button>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Prodotto Oggi', value: `CHF ${stats.daily}`, color: 'white' },
          { label: 'Prodotto Mese', value: `CHF ${stats.monthly}`, color: 'amber' },
          { label: 'Prodotto Anno', value: `CHF ${stats.yearly}`, color: 'black' },
          { label: 'Ferie Residue', value: `${stats.vacationRemaining} gg`, color: 'white' },
        ].map((stat, i) => (
          <div key={i} className={`p-6 rounded-[2rem] border border-gray-50 shadow-sm ${stat.color === 'black' ? 'bg-black text-white' : stat.color === 'amber' ? 'bg-amber-50 border-amber-100' : 'bg-white'}`}>
            <p className={`text-[8px] font-bold uppercase tracking-widest mb-2 ${stat.color === 'black' ? 'text-amber-500' : 'text-gray-400'}`}>{stat.label}</p>
            <h3 className="text-2xl font-luxury font-bold">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-10">
        <div className="bg-white p-8 rounded-[3rem] border border-gray-50 shadow-sm">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-8">Agenda del Giorno</h3>
          <div className="space-y-4">
            {myAppointments.filter(a => a.date.startsWith(new Date().toISOString().split('T')[0])).length > 0 ? (
              myAppointments.filter(a => a.date.startsWith(new Date().toISOString().split('T')[0])).map(app => (
                <div key={app.id} className="p-5 bg-gray-50 rounded-2xl flex justify-between items-center group hover:bg-white hover:shadow-md transition-all">
                  <div>
                    <p className="text-[10px] font-bold text-amber-600 uppercase mb-1">{new Date(app.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                    <h5 className="font-bold text-sm">{app.profiles?.full_name || 'Ospite'}</h5>
                    <p className="text-[9px] text-gray-400 uppercase tracking-widest">{app.services?.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold">CHF {app.services?.price}</p>
                    <p className="text-[8px] text-gray-400">{app.services?.duration} min</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-300 text-[10px] font-bold uppercase text-center py-10">Nessun appuntamento previsto.</p>
            )}
          </div>
        </div>

        <div className="bg-white p-8 rounded-[3rem] border border-gray-50 shadow-sm">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-8">Stato Richieste</h3>
          <div className="space-y-4">
            {requests.filter(r => r.member_name === member.name).slice(0, 5).map(req => (
              <div key={req.id} className="p-5 border border-gray-50 rounded-2xl flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${req.status === 'pending' ? 'bg-amber-500' : req.status === 'approved' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    <p className="text-[9px] font-bold uppercase tracking-widest">{req.type}</p>
                  </div>
                  <p className="text-[11px] font-luxury">{new Date(req.start_date).toLocaleDateString()} → {new Date(req.end_date).toLocaleDateString()}</p>
                </div>
                <span className={`px-4 py-1 rounded-full text-[8px] font-bold uppercase ${req.status === 'pending' ? 'bg-amber-50 text-amber-600' : req.status === 'approved' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                  {req.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {isRequestModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[1000] flex items-center justify-center p-4">
          <form onSubmit={handleSubmitRequest} className="bg-white w-full max-w-lg rounded-[3rem] p-10 shadow-2xl space-y-8 animate-in zoom-in-95">
            <h3 className="text-2xl font-luxury font-bold">Nuova Richiesta</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[9px] font-bold uppercase tracking-widest text-amber-600">Tipo di Assenza</label>
                <select value={newReq.type} onChange={e => setNewReq({...newReq, type: e.target.value})} className="w-full p-4 rounded-2xl bg-gray-50 border-none font-bold text-xs outline-none">
                  <option value="vacation">Ferie / Vacanza</option>
                  <option value="sick">Malattia</option>
                  <option value="overtime">Compensazione Straordinario</option>
                  <option value="training">Formazione / Workshop</option>
                  <option value="availability_change">Cambio Orari Lavoro</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-amber-600">Dal</label>
                  <input type="date" required value={newReq.start} onChange={e => setNewReq({...newReq, start: e.target.value})} className="w-full p-4 rounded-2xl bg-gray-50 border-none font-bold text-xs" />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-amber-600">Al</label>
                  <input type="date" required value={newReq.end} onChange={e => setNewReq({...newReq, end: e.target.value})} className="w-full p-4 rounded-2xl bg-gray-50 border-none font-bold text-xs" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-bold uppercase tracking-widest text-amber-600">Note per l'Amministrazione</label>
                <textarea value={newReq.notes} onChange={e => setNewReq({...newReq, notes: e.target.value})} rows={3} className="w-full p-4 rounded-2xl bg-gray-50 border-none font-bold text-xs resize-none" />
              </div>
            </div>
            <div className="flex gap-4">
              <button type="button" onClick={() => setIsRequestModalOpen(false)} className="flex-1 py-4 text-gray-400 font-bold uppercase text-[9px] tracking-widest">Annulla</button>
              <button type="submit" className="flex-[2] py-4 bg-black text-white rounded-2xl font-bold uppercase text-[9px] tracking-widest shadow-xl">Invia Richiesta</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default CollaboratorDashboard;
