
import React, { useState, useMemo } from 'react';
import { TeamMember, Appointment, LeaveRequest, User } from '../types';

interface CollaboratorDashboardProps {
  member: TeamMember;
  appointments: Appointment[];
  requests: LeaveRequest[];
  user: User;
  onSendRequest: (req: any) => void;
  onUpdateProfile: (p: any) => void;
}

const CollaboratorDashboard: React.FC<CollaboratorDashboardProps> = ({ member, appointments, requests, user, onSendRequest, onUpdateProfile }) => {
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [newReq, setNewReq] = useState({ type: 'vacation', start: '', end: '', notes: '' });
  
  const [editProfile, setEditProfile] = useState({
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    avatar: member.avatar || '',
    bio: member.bio || ''
  });

  const myAppointments = useMemo(() => 
    appointments.filter(a => a.team_member_name === member.name).sort((a,b) => a.date.localeCompare(b.date)),
  [appointments, member]);

  const stats = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const month = now.getMonth();
    const year = now.getFullYear();

    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0,0,0,0);

    const getRev = (appts: Appointment[]) => appts.filter(a => a.status === 'confirmed').reduce((acc, a) => acc + (a.services?.price || 0), 0);

    return {
      daily: getRev(myAppointments.filter(a => a.date.startsWith(todayStr))),
      weekly: getRev(myAppointments.filter(a => new Date(a.date) >= startOfWeek)),
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

  const handleUpdateProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({
      id: user.id,
      full_name: editProfile.fullName,
      email: editProfile.email,
      phone: editProfile.phone,
      avatar: editProfile.avatar,
      bio: editProfile.bio
    });
    setIsProfileModalOpen(false);
    alert("Profilo aggiornato.");
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="relative">
            <img src={member.avatar || `https://ui-avatars.com/api/?name=${member.name}`} className="w-24 h-24 rounded-full shadow-2xl object-cover border-4 border-white" />
            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-black text-white rounded-full flex items-center justify-center border-2 border-white">
              <i className="fas fa-check text-[10px]"></i>
            </div>
          </div>
          <div>
            <p className="text-amber-600 text-[10px] font-bold uppercase tracking-[0.3em] mb-2">Professional Workspace</p>
            <h2 className="text-5xl font-luxury font-bold text-gray-900 tracking-tighter">{member.name}</h2>
          </div>
        </div>
        <div className="flex gap-4">
          <button onClick={() => setIsProfileModalOpen(true)} className="px-6 py-4 bg-white border border-gray-100 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:shadow-md transition-all">Modifica Profilo</button>
          <button onClick={() => setIsRequestModalOpen(true)} className="px-8 py-4 bg-black text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-xl">Richiedi Congedo</button>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Produzione Oggi', value: `CHF ${stats.daily}`, color: 'white' },
          { label: 'Questa Settimana', value: `CHF ${stats.weekly}`, color: 'white' },
          { label: 'Volume Mese', value: `CHF ${stats.monthly}`, color: 'amber' },
          { label: 'Ferie Residue', value: `${stats.vacationRemaining} gg`, color: 'black' },
        ].map((stat, i) => (
          <div key={i} className={`p-6 rounded-[2rem] border border-gray-50 shadow-sm ${stat.color === 'black' ? 'bg-black text-white' : stat.color === 'amber' ? 'bg-amber-50 border-amber-100' : 'bg-white'}`}>
            <p className={`text-[8px] font-bold uppercase tracking-widest mb-2 ${stat.color === 'black' ? 'text-amber-500' : 'text-gray-400'}`}>{stat.label}</p>
            <h3 className="text-2xl font-luxury font-bold">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-10">
        <div className="bg-white p-8 rounded-[3rem] border border-gray-50 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Ritual in Programma</h3>
            <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[8px] font-bold uppercase">Prossimi</span>
          </div>
          <div className="space-y-4">
            {myAppointments.filter(a => new Date(a.date) >= new Date()).length > 0 ? (
              myAppointments.filter(a => new Date(a.date) >= new Date()).slice(0, 5).map(app => (
                <div key={app.id} className="p-5 bg-gray-50 rounded-2xl flex justify-between items-center group hover:bg-white hover:shadow-md transition-all">
                  <div>
                    <p className="text-[10px] font-bold text-amber-600 uppercase mb-1">
                      {new Date(app.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                    </p>
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
              <p className="text-gray-300 text-[10px] font-bold uppercase text-center py-10">Nessun rituale previsto.</p>
            )}
          </div>
        </div>

        <div className="bg-white p-8 rounded-[3rem] border border-gray-50 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Log Richieste</h3>
            <span className="text-[8px] font-bold text-gray-400 uppercase">Storico</span>
          </div>
          <div className="space-y-4">
            {requests.filter(r => r.member_name === member.name).slice(0, 5).map(req => (
              <div key={req.id} className="p-5 border border-gray-50 rounded-2xl flex justify-between items-center">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest mb-1">{req.type}</p>
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

      {/* MODALE PROFILO */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[1000] flex items-center justify-center p-4">
          <form onSubmit={handleUpdateProfileSubmit} className="bg-white w-full max-w-xl rounded-[3rem] p-10 shadow-2xl space-y-8">
            <h3 className="text-2xl font-luxury font-bold">Impostazioni Artista</h3>
            <div className="space-y-4">
              <input type="text" placeholder="URL Foto" value={editProfile.avatar} onChange={e => setEditProfile({...editProfile, avatar: e.target.value})} className="w-full p-4 rounded-2xl bg-gray-50 border-none font-bold text-xs" />
              <input type="text" value={editProfile.fullName} onChange={e => setEditProfile({...editProfile, fullName: e.target.value})} className="w-full p-4 rounded-2xl bg-gray-50 border-none font-bold text-xs" />
              <textarea rows={3} value={editProfile.bio} onChange={e => setEditProfile({...editProfile, bio: e.target.value})} className="w-full p-4 rounded-2xl bg-gray-50 border-none font-bold text-xs resize-none" placeholder="La tua filosofia artistica..." />
            </div>
            <div className="flex gap-4">
              <button type="button" onClick={() => setIsProfileModalOpen(false)} className="flex-1 py-4 text-gray-400 font-bold uppercase text-[9px]">Annulla</button>
              <button type="submit" className="flex-[2] py-4 bg-black text-white rounded-2xl font-bold uppercase text-[9px] shadow-xl">Salva Modifiche</button>
            </div>
          </form>
        </div>
      )}

      {/* MODALE RICHIESTA */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[1000] flex items-center justify-center p-4">
          <form onSubmit={handleSubmitRequest} className="bg-white w-full max-w-lg rounded-[3rem] p-10 shadow-2xl space-y-8">
            <h3 className="text-2xl font-luxury font-bold">Nuova Richiesta</h3>
            <div className="space-y-4">
              <select value={newReq.type} onChange={e => setNewReq({...newReq, type: e.target.value})} className="w-full p-4 rounded-2xl bg-gray-50 border-none font-bold text-xs">
                <option value="vacation">Ferie</option>
                <option value="sick">Malattia</option>
                <option value="training">Formazione</option>
              </select>
              <div className="grid grid-cols-2 gap-4">
                <input type="date" required value={newReq.start} onChange={e => setNewReq({...newReq, start: e.target.value})} className="w-full p-4 rounded-2xl bg-gray-50 border-none font-bold text-xs" />
                <input type="date" required value={newReq.end} onChange={e => setNewReq({...newReq, end: e.target.value})} className="w-full p-4 rounded-2xl bg-gray-50 border-none font-bold text-xs" />
              </div>
              <textarea value={newReq.notes} onChange={e => setNewReq({...newReq, notes: e.target.value})} rows={3} placeholder="Note opzionali..." className="w-full p-4 rounded-2xl bg-gray-50 border-none font-bold text-xs resize-none" />
            </div>
            <button type="submit" className="w-full py-4 bg-black text-white rounded-2xl font-bold uppercase text-[9px] shadow-xl">Invia Richiesta</button>
          </form>
        </div>
      )}
    </div>
  );
};

export default CollaboratorDashboard;
