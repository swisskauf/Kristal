
import React, { useState, useMemo } from 'react';
import { TeamMember, Appointment, LeaveRequest, User } from '../types';

interface CollaboratorDashboardProps {
  member: TeamMember;
  appointments: Appointment[];
  requests: LeaveRequest[];
  user: User;
  onSendRequest: (req: any) => void;
  onUpdateProfile: (p: any) => void;
  onAddManualAppointment: () => void;
}

const CollaboratorDashboard: React.FC<CollaboratorDashboardProps> = ({ member, appointments, requests, user, onSendRequest, onUpdateProfile, onAddManualAppointment }) => {
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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditProfile({ ...editProfile, avatar: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const myAppointments = useMemo(() => 
    appointments.filter(a => a.team_member_name === member.name).sort((a,b) => a.date.localeCompare(b.date)),
  [appointments, member.name]);

  const stats = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const getRev = (appts: Appointment[]) => appts.filter(a => a.status === 'confirmed').reduce((acc, a) => acc + (a.services?.price || 0), 0);
    return {
      daily: getRev(myAppointments.filter(a => a.date.startsWith(todayStr))),
      vacationRemaining: (member.total_vacation_days_per_year || 25) - (member.absences_json?.filter(a => a.type === 'vacation').length || 0)
    };
  }, [myAppointments, member]);

  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    onSendRequest({
      type: newReq.type,
      start_date: newReq.start,
      end_date: newReq.end,
      notes: newReq.notes,
      status: 'pending',
      created_at: new Date().toISOString()
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
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex items-center gap-6">
          <img src={member.avatar || `https://ui-avatars.com/api/?name=${member.name}`} className="w-24 h-24 rounded-full shadow-2xl object-cover border-4 border-white" />
          <div>
            <p className="text-amber-600 text-[10px] font-bold uppercase tracking-[0.3em] mb-2">Workspace Artista</p>
            <h2 className="text-5xl font-luxury font-bold text-gray-900 tracking-tighter">{member.name}</h2>
          </div>
        </div>
        <div className="flex gap-4">
          <button onClick={onAddManualAppointment} className="px-6 py-4 bg-amber-600 text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:shadow-md transition-all">Manuale Ritual</button>
          <button onClick={() => setIsProfileModalOpen(true)} className="px-6 py-4 bg-white border border-gray-100 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:shadow-md transition-all">Modifica Profilo</button>
          <button onClick={() => setIsRequestModalOpen(true)} className="px-8 py-4 bg-black text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-xl">Richiedi Congedo</button>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-8 bg-white rounded-[2.5rem] border border-gray-50 shadow-sm">
          <p className="text-[8px] font-bold uppercase tracking-widest text-gray-400 mb-2">Produzione Oggi</p>
          <h3 className="text-2xl font-luxury font-bold">CHF {stats.daily}</h3>
        </div>
        <div className="p-8 bg-black text-white rounded-[2.5rem] shadow-xl">
          <p className="text-[8px] font-bold uppercase tracking-widest text-amber-500 mb-2">Ferie Residue</p>
          <h3 className="text-2xl font-luxury font-bold">{stats.vacationRemaining} gg</h3>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-10">
        <div className="bg-white p-10 rounded-[3.5rem] border border-gray-50 shadow-sm">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-8">Agenda Prossimi Ritual</h3>
          <div className="space-y-4">
            {myAppointments.filter(a => new Date(a.date) >= new Date()).slice(0, 5).map(app => (
              <div key={app.id} className="p-6 bg-gray-50 rounded-3xl flex justify-between items-center group hover:bg-white hover:shadow-md transition-all">
                <div>
                  <p className="text-[10px] font-bold text-amber-600 uppercase mb-1">
                    {new Date(app.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                  </p>
                  <h5 className="font-bold text-sm">{app.profiles?.full_name || 'Ospite'}</h5>
                  <p className="text-[9px] text-gray-400 uppercase tracking-widest">{app.services?.name}</p>
                </div>
                <div className="text-right"><p className="text-xs font-bold">CHF {app.services?.price}</p></div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-10 rounded-[3.5rem] border border-gray-50 shadow-sm">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-8">Registro Richieste Personali</h3>
          <div className="space-y-4">
            {requests.filter(r => r.member_name === member.name).sort((a,b) => b.created_at.localeCompare(a.created_at)).slice(0, 5).map(req => {
              const isRevocation = req.type === 'availability_change' as string;
              return (
                <div key={req.id} className="p-6 border border-gray-50 rounded-3xl flex justify-between items-center bg-gray-50/50">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 ${isRevocation ? 'bg-amber-600 text-white' : 'bg-gray-200 text-gray-500'} rounded-2xl flex items-center justify-center`}>
                      <i className={`fas ${isRevocation ? 'fa-undo' : 'fa-calendar'} text-xs`}></i>
                    </div>
                    <div>
                      <p className={`text-[9px] font-bold uppercase tracking-widest ${isRevocation ? 'text-amber-600' : 'text-gray-400'}`}>{isRevocation ? 'Revoca' : req.type}</p>
                      <p className="text-[11px] font-bold">{new Date(req.start_date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <span className={`px-4 py-1.5 rounded-full text-[8px] font-bold uppercase ${req.status === 'pending' ? 'bg-amber-100 text-amber-700' : req.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{req.status}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {isProfileModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[1000] flex items-center justify-center p-4">
          <form onSubmit={handleUpdateProfileSubmit} className="bg-white w-full max-w-xl rounded-[4rem] p-12 shadow-2xl space-y-8 relative">
            <button type="button" onClick={() => setIsProfileModalOpen(false)} className="absolute top-8 right-10 text-gray-300 hover:text-black">
              <i className="fas fa-times text-2xl"></i>
            </button>
            <h3 className="text-2xl font-luxury font-bold text-center">Mio Profilo Kristal</h3>
            
            <div className="flex flex-col items-center">
              <div className="relative group cursor-pointer w-28 h-28">
                <img 
                  src={editProfile.avatar || `https://ui-avatars.com/api/?name=${editProfile.fullName}&background=f3f4f6&color=9ca3af`} 
                  className="w-full h-full rounded-[2rem] object-cover border-4 border-white shadow-xl transition-all group-hover:opacity-80" 
                />
                <label className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer bg-black/20 rounded-[2rem]">
                  <i className="fas fa-camera text-xl text-white"></i>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </label>
              </div>
              <p className="text-[8px] font-bold text-gray-400 uppercase mt-4 tracking-widest">Aggiorna Foto</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase text-gray-400 ml-1">Biografia Artistica</label>
                <textarea rows={3} value={editProfile.bio} onChange={e => setEditProfile({...editProfile, bio: e.target.value})} className="w-full p-4 rounded-2xl bg-gray-50 border-none font-bold text-xs resize-none shadow-inner" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase text-gray-400 ml-1">Telefono</label>
                  <input type="tel" value={editProfile.phone} onChange={e => setEditProfile({...editProfile, phone: e.target.value})} className="w-full p-4 rounded-2xl bg-gray-50 border-none font-bold text-xs shadow-inner" />
                </div>
                <div className="space-y-1">
                   <label className="text-[9px] font-bold uppercase text-gray-400 ml-1">Email</label>
                   <input type="email" disabled value={editProfile.email} className="w-full p-4 rounded-2xl bg-gray-100 border-none font-bold text-xs text-gray-400" />
                </div>
              </div>
            </div>
            <div className="flex gap-4">
              <button type="button" onClick={() => setIsProfileModalOpen(false)} className="flex-1 py-4 text-gray-400 font-bold uppercase text-[9px]">Annulla</button>
              <button type="submit" className="flex-[2] py-4 bg-black text-white rounded-2xl font-bold uppercase text-[9px] shadow-xl">Aggiorna Profilo</button>
            </div>
          </form>
        </div>
      )}

      {isRequestModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[1000] flex items-center justify-center p-4">
          <form onSubmit={handleSubmitRequest} className="bg-white w-full max-w-lg rounded-[4rem] p-12 shadow-2xl space-y-8 relative">
            <button type="button" onClick={() => setIsRequestModalOpen(false)} className="absolute top-8 right-10 text-gray-300 hover:text-black">
              <i className="fas fa-times text-2xl"></i>
            </button>
            <h3 className="text-2xl font-luxury font-bold">Nuova Richiesta</h3>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[9px] font-bold uppercase text-gray-400 ml-1">Tipo di Congedo</label>
                <select value={newReq.type} onChange={e => setNewReq({...newReq, type: e.target.value})} className="w-full p-4 rounded-2xl bg-gray-50 border-none font-bold text-xs shadow-inner">
                  <option value="vacation">Ferie / Vacanza</option>
                  <option value="sick">Malattia</option>
                  <option value="training">Formazione / Workshop</option>
                  <option value="unpaid">Giorno Libero</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase text-gray-400 ml-1">Inizio</label>
                  <input type="date" required value={newReq.start} onChange={e => setNewReq({...newReq, start: e.target.value})} className="w-full p-4 rounded-2xl bg-gray-50 border-none font-bold text-xs shadow-inner" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase text-gray-400 ml-1">Fine</label>
                  <input type="date" required value={newReq.end} onChange={e => setNewReq({...newReq, end: e.target.value})} className="w-full p-4 rounded-2xl bg-gray-50 border-none font-bold text-xs shadow-inner" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase text-gray-400 ml-1">Note</label>
                <textarea value={newReq.notes} onChange={e => setNewReq({...newReq, notes: e.target.value})} rows={3} placeholder="Note opzionali..." className="w-full p-4 rounded-2xl bg-gray-50 border-none font-bold text-xs resize-none shadow-inner" />
              </div>
            </div>
            <button type="submit" className="w-full py-5 bg-black text-white rounded-3xl font-bold uppercase text-[10px] tracking-widest shadow-2xl">Invia Richiesta</button>
          </form>
        </div>
      )}
    </div>
  );
};

export default CollaboratorDashboard;
