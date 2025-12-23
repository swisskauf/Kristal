
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Auth from './components/Auth';
import AIAssistant from './components/AIAssistant';
import AppointmentForm from './components/AppointmentForm';
import { supabase, db } from './services/supabase';
import { Service, User, TeamMember } from './types';
import { SERVICES as DEFAULT_SERVICES, TEAM as DEFAULT_TEAM } from './constants';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [appointments, setAppointments] = useState<any[]>([]);
  const [services, setServices] = useState<Service[]>(DEFAULT_SERVICES);
  const [team, setTeam] = useState<TeamMember[]>(DEFAULT_TEAM);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any | undefined>();
  const [filterCategory, setFilterCategory] = useState<string>('Tutti');

  const [editingService, setEditingService] = useState<any>(null);
  const [editingMember, setEditingMember] = useState<any>(null);
  const [editingProfile, setEditingProfile] = useState<any>(null);
  const [newOffDate, setNewOffDate] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await handleSessionUser(session.user);
        }
      } catch (e) {
        console.error("Auth init error:", e);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await handleSessionUser(session.user);
        setIsAuthOpen(false);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSessionUser = async (supabaseUser: any) => {
    try {
      let profile = await db.profiles.get(supabaseUser.id);
      
      if (!profile) {
        const metadata = supabaseUser.user_metadata || {};
        profile = await db.profiles.upsert({
          id: supabaseUser.id,
          full_name: metadata.full_name || metadata.name || 'Nuovo Cliente',
          phone: metadata.phone || '',
          role: metadata.role || 'client',
          avatar: metadata.avatar_url || ''
        });
      }

      setUser({
        id: supabaseUser.id,
        email: supabaseUser.email!,
        fullName: profile?.full_name || 'Utente',
        phone: profile?.phone || '',
        role: profile?.role || 'client',
        avatar: profile?.avatar || ''
      });
    } catch (err) {
      console.error("Errore profilo:", err);
    }
  };

  useEffect(() => {
    refreshData();
  }, [user]);

  const refreshData = async () => {
    try {
      const [appts, svcs, tm] = await Promise.all([
        db.appointments.getAll(),
        db.services.getAll(),
        db.team.getAll()
      ]);
      
      setAppointments(appts);
      if (svcs && svcs.length > 0) setServices(svcs);
      if (tm && tm.length > 0) setTeam(tm);

      if (user?.role === 'admin') {
        const prfs = await db.profiles.getAll();
        setProfiles(prfs);
        if (activeTab === 'dashboard') setActiveTab('admin_dashboard');
      }
    } catch (err) {
      console.error("Errore caricamento dati:", err);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setActiveTab('dashboard');
  };

  const saveService = async (e: React.FormEvent) => {
    e.preventDefault();
    await db.services.upsert(editingService);
    setEditingService(null);
    refreshData();
  };

  const saveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    await db.team.upsert(editingMember);
    setEditingMember(null);
    refreshData();
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await db.profiles.upsert(editingProfile);
    if (editingProfile.id === user?.id) {
      setUser({ ...user, fullName: editingProfile.full_name, phone: editingProfile.phone, avatar: editingProfile.avatar } as any);
    }
    setEditingProfile(null);
    refreshData();
  };

  const addOffDate = async (memberName: string) => {
    if (!newOffDate) return;
    const member = team.find(m => m.name === memberName);
    if (!member) return;
    const currentDates = member.unavailable_dates || [];
    if (!currentDates.includes(newOffDate)) {
      await db.team.upsert({ ...member, unavailable_dates: [...currentDates, newOffDate] });
      setNewOffDate('');
      refreshData();
    }
  };

  const saveAppointment = async (appData: any) => {
    if (!user) return;
    try {
      const appointmentToSave = {
        id: selectedAppointment?.id,
        client_id: user.role === 'admin' ? (appData.clientId || selectedAppointment?.client_id) : user.id,
        service_id: appData.serviceId,
        team_member_name: appData.teamMember,
        date: appData.date,
        status: 'confirmed'
      };
      await db.appointments.upsert(appointmentToSave);
      await refreshData();
      setIsFormOpen(false);
      setSelectedAppointment(undefined);
    } catch (e) {
      alert("Errore salvataggio.");
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  const filteredServices = filterCategory === 'Tutti' ? services : services.filter(s => s.category === filterCategory);
  const categories = ['Tutti', ...Array.from(new Set(services.map(s => s.category)))];

  return (
    <Layout user={user} onLogout={handleLogout} onLoginClick={() => setIsAuthOpen(true)} activeTab={activeTab} setActiveTab={setActiveTab}>
      
      {isAuthOpen && (
        <div className="fixed inset-0 bg-white z-[300] overflow-y-auto">
          <div className="absolute top-6 right-6"><button onClick={() => setIsAuthOpen(false)} className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-500"><i className="fas fa-times"></i></button></div>
          <Auth onLogin={handleSessionUser} />
        </div>
      )}

      {/* DASHBOARD CLIENTE / GUEST */}
      {activeTab === 'dashboard' && (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              {user && (
                <button onClick={() => setEditingProfile(user)} className="relative group">
                  <img src={user.avatar || `https://ui-avatars.com/api/?name=${user.fullName}`} className="w-16 h-16 rounded-full object-cover border-2 border-amber-500" />
                  <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><i className="fas fa-camera text-white text-xs"></i></div>
                </button>
              )}
              <div>
                <h2 className="text-4xl font-luxury font-bold leading-tight">{user ? `Ciao, ${user.fullName.split(' ')[0]}!` : "Benvenuti da Kristal"}<br/><span className="text-amber-500">Luxury Beauty Salon</span></h2>
              </div>
            </div>
            <button onClick={() => { if(!user) setIsAuthOpen(true); else setIsFormOpen(true); }} className="bg-black text-white px-8 py-5 rounded-2xl font-bold shadow-2xl hover:scale-105 transition-all">Prenota Ora</button>
          </header>

          <div className="flex items-center space-x-2 overflow-x-auto pb-4 scrollbar-hide">
            {categories.map(c => (
              <button key={c} onClick={() => setFilterCategory(c)} className={`px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${filterCategory === c ? 'bg-amber-500 text-white shadow-lg shadow-amber-200' : 'bg-white border border-gray-100 text-gray-400'}`}>{c}</button>
            ))}
          </div>

          <div className="grid gap-4">
            {filteredServices.map(s => (
              <button key={s.id} onClick={() => { if(!user) setIsAuthOpen(true); else { setSelectedAppointment({ service_id: s.id }); setIsFormOpen(true); } }} className="bg-white p-6 rounded-[2.5rem] border border-gray-100 flex justify-between items-center hover:shadow-lg transition-all group text-left">
                <div className="flex-1">
                  <p className="text-[9px] font-bold text-amber-500 uppercase tracking-widest">{s.category}</p>
                  <h4 className="font-bold text-lg group-hover:text-amber-600 transition-colors">{s.name}</h4>
                  <p className="text-xs text-gray-400 line-clamp-1 mr-4">{s.description}</p>
                </div>
                <div className="text-right">
                   <p className="font-bold text-xl text-gray-900">CHF {s.price}</p>
                   <p className="text-[10px] text-gray-300 font-bold uppercase">{s.duration} min</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ADMIN: TEAM SCHEDULE */}
      {activeTab === 'team_schedule' && user?.role === 'admin' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="flex justify-between items-center">
            <h2 className="text-3xl font-luxury font-bold">Agenda Staff</h2>
            <button onClick={() => setEditingMember({ name: '', role: '', start_hour: 8, end_hour: 18, unavailable_dates: [] })} className="bg-gray-900 text-white px-6 py-3 rounded-xl font-bold text-xs">Nuovo Staff</button>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {team.map(m => (
              <div key={m.name} className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button onClick={() => setEditingMember(m)} className="relative group">
                      <img src={m.avatar || `https://ui-avatars.com/api/?name=${m.name}`} className="w-16 h-16 rounded-full border-2 border-amber-50 object-cover" />
                      <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><i className="fas fa-edit text-white text-xs"></i></div>
                    </button>
                    <div>
                      <h4 className="font-bold text-xl">{m.name}</h4>
                      <p className="text-xs text-gray-400 uppercase font-bold tracking-widest">{m.role}</p>
                      <p className="text-[10px] font-bold text-amber-600 mt-1 uppercase">Orario: {m.start_hour ?? 8}:00 - {m.end_hour ?? 18}:00</p>
                    </div>
                  </div>
                  <button onClick={async () => { if(confirm('Rimuovere?')) { await db.team.delete(m.name); refreshData(); }}} className="text-red-400"><i className="fas fa-trash"></i></button>
                </div>

                <div className="border-t pt-4">
                  <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Giorni OFF</h5>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {m.unavailable_dates?.map(date => (
                      <span key={date} className="bg-red-50 text-red-600 px-3 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-2">
                        {date} <button onClick={async () => { const upd = { ...m, unavailable_dates: m.unavailable_dates?.filter(d => d !== date) }; await db.team.upsert(upd); refreshData(); }}><i className="fas fa-times"></i></button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input type="date" className="flex-1 bg-gray-50 border-none rounded-xl p-3 text-[10px] font-bold" onChange={(e) => setNewOffDate(e.target.value)} />
                    <button onClick={() => addOffDate(m.name)} className="bg-amber-100 text-amber-600 px-4 py-2 rounded-xl text-[10px] font-bold uppercase">Blocca</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ADMIN: LISTA CLIENTI */}
      {activeTab === 'calendar' && user?.role === 'admin' && (
        <div className="mt-12 space-y-8">
          <h3 className="text-2xl font-luxury font-bold">Clienti Registrati</h3>
          <div className="grid gap-4">
            {profiles.map(p => (
              <div key={p.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <img src={p.avatar || `https://ui-avatars.com/api/?name=${p.full_name}`} className="w-12 h-12 rounded-full object-cover" />
                  <div>
                    <h5 className="font-bold">{p.full_name}</h5>
                    <p className="text-xs text-gray-400">{p.phone}</p>
                  </div>
                </div>
                <button onClick={() => setEditingProfile(p)} className="p-3 bg-gray-50 rounded-xl text-gray-400 hover:text-amber-500"><i className="fas fa-user-edit"></i></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODALE MODIFICA STAFF / ORARI */}
      {editingMember && (
        <div className="fixed inset-0 bg-black/60 z-[400] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-10">
            <h3 className="text-2xl font-luxury font-bold mb-6">Modifica {editingMember.name || 'Staff'}</h3>
            <form onSubmit={saveMember} className="space-y-4">
              <input placeholder="Nome" className="w-full p-4 bg-gray-50 rounded-2xl" value={editingMember.name} onChange={e => setEditingMember({...editingMember, name: e.target.value})} required />
              <input placeholder="Ruolo" className="w-full p-4 bg-gray-50 rounded-2xl" value={editingMember.role} onChange={e => setEditingMember({...editingMember, role: e.target.value})} required />
              <input placeholder="URL Foto Avatar" className="w-full p-4 bg-gray-50 rounded-2xl" value={editingMember.avatar} onChange={e => setEditingMember({...editingMember, avatar: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block">Inizio Turno</label><input type="number" className="w-full p-4 bg-gray-50 rounded-2xl" value={editingMember.start_hour} onChange={e => setEditingMember({...editingMember, start_hour: Number(e.target.value)})} /></div>
                <div><label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block">Fine Turno</label><input type="number" className="w-full p-4 bg-gray-50 rounded-2xl" value={editingMember.end_hour} onChange={e => setEditingMember({...editingMember, end_hour: Number(e.target.value)})} /></div>
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setEditingMember(null)} className="flex-1 py-4 text-gray-400 font-bold uppercase text-[10px]">Annulla</button>
                <button type="submit" className="flex-1 py-4 bg-black text-white rounded-2xl font-bold uppercase text-[10px]">Salva</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODALE MODIFICA PROFILO CLIENTE */}
      {editingProfile && (
        <div className="fixed inset-0 bg-black/60 z-[400] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-10">
            <h3 className="text-2xl font-luxury font-bold mb-6">Modifica Profilo</h3>
            <form onSubmit={saveProfile} className="space-y-4">
              <input placeholder="Nome Completo" className="w-full p-4 bg-gray-50 rounded-2xl" value={editingProfile.full_name} onChange={e => setEditingProfile({...editingProfile, full_name: e.target.value})} required />
              <input placeholder="Telefono" className="w-full p-4 bg-gray-50 rounded-2xl" value={editingProfile.phone} onChange={e => setEditingProfile({...editingProfile, phone: e.target.value})} />
              <input placeholder="URL Foto Profilo" className="w-full p-4 bg-gray-50 rounded-2xl" value={editingProfile.avatar} onChange={e => setEditingProfile({...editingProfile, avatar: e.target.value})} />
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setEditingProfile(null)} className="flex-1 py-4 text-gray-400 font-bold uppercase text-[10px]">Annulla</button>
                <button type="submit" className="flex-1 py-4 bg-amber-500 text-white rounded-2xl font-bold uppercase text-[10px]">Aggiorna</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODALE PRENOTAZIONE */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-[3rem] p-10 shadow-2xl overflow-y-auto max-h-[95vh]">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-luxury font-bold">Nuova Prenotazione</h3>
              <button onClick={() => setIsFormOpen(false)} className="text-gray-400 hover:text-gray-900"><i className="fas fa-times text-xl"></i></button>
            </div>
            <AppointmentForm 
              services={services} team={team} existingAppointments={appointments}
              onSave={saveAppointment} onCancel={() => setIsFormOpen(false)} 
              initialData={selectedAppointment} isAdmin={user?.role === 'admin'} profiles={profiles}
            />
          </div>
        </div>
      )}

      <AIAssistant />
    </Layout>
  );
};

export default App;
