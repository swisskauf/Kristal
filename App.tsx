
import React, { useState, useEffect, useMemo } from 'react';
import Layout from './components/Layout';
import Auth from './components/Auth';
import AIAssistant from './components/AIAssistant';
import AppointmentForm from './components/AppointmentForm';
import { supabase, db } from './services/supabase';
import { Service, User, TeamMember, TreatmentRecord, AppSettings, Appointment } from './types';
import { SERVICES as DEFAULT_SERVICES, TEAM as DEFAULT_TEAM } from './constants';

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
  const [clientSearch, setClientSearch] = useState('');

  const [editingService, setEditingService] = useState<any>(null);
  const [editingMember, setEditingMember] = useState<any>(null);
  const [editingProfile, setEditingProfile] = useState<any>(null);
  const [viewingHistory, setViewingHistory] = useState<User | null>(null);
  const [editingTreatmentIndex, setEditingTreatmentIndex] = useState<number | null>(null);
  const [newOffDate, setNewOffDate] = useState('');

  const [newTreatment, setNewTreatment] = useState<TreatmentRecord>({ 
    date: new Date().toISOString().split('T')[0], 
    service: '', 
    notes: '' 
  });

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) await handleSessionUser(session.user);
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
          avatar: metadata.avatar_url || '',
          treatment_history: []
        });
      }
      const mappedUser: User = {
        id: supabaseUser.id,
        email: supabaseUser.email!,
        fullName: profile?.full_name || 'Utente',
        phone: profile?.phone || '',
        role: profile?.role || 'client',
        avatar: profile?.avatar || '',
        treatment_history: profile?.treatment_history || []
      };
      setUser(mappedUser);
      return mappedUser;
    } catch (err) {
      console.error("Errore profilo:", err);
      return null;
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
      }
    } catch (err) {
      console.error("Errore refresh dati:", err);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setActiveTab('dashboard');
  };

  const saveAppointment = async (appData: Partial<Appointment>) => {
    if (!user) return;
    try {
      const appointmentToSave = {
        id: selectedAppointment?.id,
        client_id: user.role === 'admin' ? (appData.client_id || selectedAppointment?.client_id) : user.id,
        service_id: appData.service_id,
        team_member_name: appData.team_member_name,
        date: appData.date,
        status: 'confirmed'
      };
      await db.appointments.upsert(appointmentToSave);
      await refreshData();
      setIsFormOpen(false);
      setSelectedAppointment(undefined);
    } catch (e) {
      console.error("Save error:", e);
      alert("Errore nel salvataggio. Riprova.");
    }
  };

  const addOffDate = async (memberName: string) => {
    if (!newOffDate) return;
    const member = team.find(m => m.name === memberName);
    if (!member) return;
    const currentDates = member.unavailable_dates || [];
    if (!currentDates.includes(newOffDate)) {
      await db.team.upsert({ ...member, unavailable_dates: [...currentDates, newOffDate].sort() });
      setNewOffDate('');
      refreshData();
    }
  };

  const filteredProfiles = useMemo(() => {
    if (!clientSearch) return profiles;
    return profiles.filter(p => 
      p.full_name?.toLowerCase().includes(clientSearch.toLowerCase()) || 
      p.phone?.includes(clientSearch) ||
      p.email?.toLowerCase().includes(clientSearch.toLowerCase())
    );
  }, [profiles, clientSearch]);

  const addOrUpdateTreatment = async () => {
    if (!viewingHistory || !newTreatment.service) return;
    let updatedHistory = [...(viewingHistory.treatment_history || [])];
    if (editingTreatmentIndex !== null) updatedHistory[editingTreatmentIndex] = newTreatment;
    else updatedHistory.push(newTreatment);
    
    const updatedProfile = { ...viewingHistory, treatment_history: updatedHistory };
    await db.profiles.upsert(updatedProfile);
    setViewingHistory(updatedProfile as any);
    setNewTreatment({ date: new Date().toISOString().split('T')[0], service: '', notes: '' });
    setEditingTreatmentIndex(null);
    refreshData();
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <Layout user={user} onLogout={handleLogout} onLoginClick={() => setIsAuthOpen(true)} activeTab={activeTab} setActiveTab={setActiveTab}>
      
      {isAuthOpen && (
        <div className="fixed inset-0 bg-white z-[300] overflow-y-auto">
          <div className="absolute top-6 right-6"><button onClick={() => setIsAuthOpen(false)} className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-500"><i className="fas fa-times"></i></button></div>
          <Auth onLogin={handleSessionUser} />
        </div>
      )}

      {/* DASHBOARD CLIENTE */}
      {activeTab === 'dashboard' && (
        <div className="space-y-12 animate-in fade-in duration-500 pb-20">
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <h2 className="text-4xl font-luxury font-bold leading-tight">
              {user ? `Ciao, ${user.fullName.split(' ')[0]}!` : "Benvenuti da Kristal"}<br/>
              <span className="text-amber-500">Luxury Beauty Salon</span>
            </h2>
            <button onClick={() => { if(!user) setIsAuthOpen(true); else setIsFormOpen(true); }} className="bg-black text-white px-8 py-5 rounded-2xl font-bold shadow-2xl hover:scale-105 transition-all">Prenota Ora</button>
          </header>

          <div className="space-y-6">
            <h3 className="text-2xl font-luxury font-bold">I Nostri Trattamenti</h3>
            <div className="grid gap-4">
              {services.filter(s => filterCategory === 'Tutti' || s.category === filterCategory).map(s => (
                <button key={s.id} onClick={() => { if(!user) setIsAuthOpen(true); else { setSelectedAppointment({ service_id: s.id }); setIsFormOpen(true); } }} className="bg-white p-6 rounded-[2.5rem] border border-gray-100 flex justify-between items-center hover:shadow-lg transition-all group text-left text-sm">
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
        </div>
      )}

      {/* ADMIN: PROFESSIONAL STAFF PLANNER */}
      {activeTab === 'team_schedule' && user?.role === 'admin' && (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
          <header className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-luxury font-bold">Staff Operativo</h2>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Pianificazione turni e assenze</p>
            </div>
            <button onClick={() => setEditingMember({ name: '', role: '', start_hour: 8, end_hour: 18, unavailable_dates: [] })} className="bg-amber-500 text-white px-6 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-xl shadow-amber-200">Nuovo Collaboratore</button>
          </header>

          <div className="grid lg:grid-cols-3 md:grid-cols-2 gap-6">
            {team.map(m => (
              <div key={m.name} className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col group hover:border-amber-200 transition-all">
                <div className="p-8 flex items-center gap-4">
                  <img src={m.avatar || `https://ui-avatars.com/api/?name=${m.name}`} className="w-16 h-16 rounded-full border-2 border-amber-500 object-cover shadow-md" />
                  <div>
                    <h4 className="font-bold text-lg">{m.name}</h4>
                    <p className="text-[9px] text-amber-600 font-bold uppercase tracking-widest">{m.role}</p>
                  </div>
                  <button onClick={() => setEditingMember(m)} className="ml-auto w-10 h-10 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center hover:bg-gray-900 hover:text-white transition-all"><i className="fas fa-cog"></i></button>
                </div>

                <div className="px-8 pb-8 space-y-6">
                  <div className="bg-gray-50 p-4 rounded-3xl grid grid-cols-2 gap-4 text-center">
                    <div>
                      <p className="text-[8px] font-bold text-gray-400 uppercase mb-1">Dalle</p>
                      <p className="font-bold text-gray-900">{m.start_hour ?? 8}:00</p>
                    </div>
                    <div className="border-l border-gray-200">
                      <p className="text-[8px] font-bold text-gray-400 uppercase mb-1">Alle</p>
                      <p className="font-bold text-gray-900">{m.end_hour ?? 18}:00</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h5 className="text-[9px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2"><i className="fas fa-calendar-alt text-amber-500"></i> Date Bloccate / Vacanze</h5>
                    <div className="flex flex-wrap gap-1.5 min-h-[30px]">
                      {m.unavailable_dates?.map(date => (
                        <span key={date} className="bg-red-50 text-red-600 px-3 py-1 rounded-full text-[9px] font-bold flex items-center gap-2 border border-red-100">
                          {new Date(date).toLocaleDateString()}
                          <button onClick={async () => {
                            const upd = { ...m, unavailable_dates: m.unavailable_dates?.filter(d => d !== date) };
                            await db.team.upsert(upd);
                            refreshData();
                          }}><i className="fas fa-times"></i></button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input type="date" className="flex-1 bg-white border border-gray-100 rounded-xl p-2.5 text-[10px] font-bold outline-none" onChange={(e) => setNewOffDate(e.target.value)} value={newOffDate} />
                      <button onClick={() => addOffDate(m.name)} className="bg-gray-900 text-white px-4 py-2 rounded-xl text-[9px] font-bold uppercase">Blocca</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ADMIN: LISTA CLIENTI & CRM */}
      {activeTab === 'clients' && user?.role === 'admin' && (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-3xl font-luxury font-bold">Archivio Clienti</h2>
            <input type="text" placeholder="Cerca cliente..." className="pl-6 pr-4 py-4 bg-white border border-gray-100 rounded-2xl text-sm w-full md:w-80 outline-none focus:ring-2 focus:ring-amber-400 transition-all" value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} />
          </div>
          <div className="grid gap-4">
            {filteredProfiles.map(p => (
              <div key={p.id} className="bg-white p-6 rounded-[2.5rem] border border-gray-100 flex items-center justify-between hover:shadow-lg transition-all group">
                <div className="flex items-center gap-4">
                  <img src={p.avatar || `https://ui-avatars.com/api/?name=${p.full_name}`} className="w-14 h-14 rounded-full object-cover border border-gray-50 shadow-sm" />
                  <div>
                    <h5 className="font-bold text-lg">{p.full_name}</h5>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{p.phone || 'Nessun numero'} • {p.email}</p>
                  </div>
                </div>
                <button onClick={() => setViewingHistory(p)} className="px-6 py-3 bg-amber-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-black transition-all shadow-md">Scheda Tecnica</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SCHEDA TECNICA MODALE */}
      {viewingHistory && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[500] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-[3rem] p-10 shadow-2xl overflow-y-auto max-h-[90vh] space-y-8">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-luxury font-bold">Scheda Tecnica Professional</h3>
              <button onClick={() => { setViewingHistory(null); setEditingTreatmentIndex(null); }} className="w-10 h-10 rounded-full bg-gray-50 text-gray-400 hover:text-gray-900 flex items-center justify-center"><i className="fas fa-times"></i></button>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="md:col-span-1 bg-amber-50 p-6 rounded-[2rem] border border-amber-100 h-fit">
                <h4 className="text-[10px] font-bold text-amber-700 uppercase tracking-widest mb-4">{editingTreatmentIndex !== null ? 'Modifica Record' : 'Nuovo Trattamento'}</h4>
                <div className="space-y-4">
                  <input type="date" className="w-full p-3 rounded-xl bg-white text-xs font-bold outline-none" value={newTreatment.date} onChange={e => setNewTreatment({...newTreatment, date: e.target.value})} />
                  <input placeholder="Servizio / Colore" className="w-full p-3 rounded-xl bg-white text-xs font-bold outline-none" value={newTreatment.service} onChange={e => setNewTreatment({...newTreatment, service: e.target.value})} />
                  <textarea placeholder="Note tecniche dettagliate..." className="w-full p-3 rounded-xl bg-white text-xs h-32 outline-none" value={newTreatment.notes} onChange={e => setNewTreatment({...newTreatment, notes: e.target.value})} />
                  <button onClick={addOrUpdateTreatment} className="w-full py-4 bg-amber-500 text-white rounded-xl font-bold uppercase text-[10px] shadow-lg">Salva Record</button>
                </div>
              </div>
              <div className="md:col-span-2 space-y-4">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Cronologia Completa</h4>
                <div className="space-y-4">
                  {(viewingHistory.treatment_history || []).slice().reverse().map((record, i) => {
                    const originalIndex = (viewingHistory.treatment_history || []).length - 1 - i;
                    return (
                      <div key={originalIndex} className="bg-white p-6 border border-gray-100 shadow-sm rounded-[2rem] group relative">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[9px] font-bold text-amber-500 block mb-1">{new Date(record.date).toLocaleDateString()}</span>
                            <h5 className="font-bold text-gray-900">{record.service}</h5>
                          </div>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                            <button onClick={() => { setEditingTreatmentIndex(originalIndex); setNewTreatment(record); }} className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-600 hover:text-white"><i className="fas fa-edit text-[10px]"></i></button>
                            <button onClick={async () => {
                              if(confirm('Eliminare?')) {
                                const updHist = viewingHistory.treatment_history?.filter((_, idx) => idx !== originalIndex);
                                await db.profiles.upsert({ ...viewingHistory, treatment_history: updHist });
                                setViewingHistory({ ...viewingHistory, treatment_history: updHist } as any);
                                refreshData();
                              }
                            }} className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-600 hover:text-white"><i className="fas fa-trash text-[10px]"></i></button>
                          </div>
                        </div>
                        <div className="mt-4 p-4 bg-gray-50 rounded-2xl text-[11px] text-gray-600 italic">"{record.notes}"</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODALE STAFF CONFIG */}
      {editingMember && (
        <div className="fixed inset-0 bg-black/60 z-[400] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl">
            <h3 className="text-2xl font-luxury font-bold mb-6">Profilo Professionista</h3>
            <form onSubmit={async (e) => { e.preventDefault(); await db.team.upsert(editingMember); setEditingMember(null); refreshData(); }} className="space-y-4">
              <input placeholder="Nome" className="w-full p-4 bg-gray-50 rounded-2xl outline-none" value={editingMember.name} onChange={e => setEditingMember({...editingMember, name: e.target.value})} required />
              <input placeholder="Ruolo" className="w-full p-4 bg-gray-50 rounded-2xl outline-none" value={editingMember.role} onChange={e => setEditingMember({...editingMember, role: e.target.value})} required />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Inizio Turno</label>
                  <input type="number" min="0" max="23" className="w-full p-4 bg-gray-50 rounded-2xl outline-none" value={editingMember.start_hour} onChange={e => setEditingMember({...editingMember, start_hour: Number(e.target.value)})} />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Fine Turno</label>
                  <input type="number" min="0" max="23" className="w-full p-4 bg-gray-50 rounded-2xl outline-none" value={editingMember.end_hour} onChange={e => setEditingMember({...editingMember, end_hour: Number(e.target.value)})} />
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setEditingMember(null)} className="flex-1 py-4 text-gray-400 font-bold uppercase text-[10px]">Annulla</button>
                <button type="submit" className="flex-1 py-4 bg-gray-900 text-white rounded-2xl font-bold uppercase text-[10px] shadow-xl">Salva</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODALE PRENOTAZIONE */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-[3rem] p-10 shadow-2xl overflow-y-auto max-h-[95vh]">
            <h3 className="text-2xl font-luxury font-bold mb-8">Nuova Prenotazione</h3>
            <AppointmentForm services={services} team={team} existingAppointments={appointments} onSave={saveAppointment} onCancel={() => setIsFormOpen(false)} initialData={selectedAppointment} isAdmin={user?.role === 'admin'} profiles={profiles} />
          </div>
        </div>
      )}

      {/* AGENDA ADMIN */}
      {activeTab === 'calendar' && user?.role === 'admin' && (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
           <h2 className="text-3xl font-luxury font-bold">Agenda Kristal</h2>
            <div className="grid gap-4">
              {appointments.length > 0 ? appointments.map(app => (
                <div key={app.id} className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex gap-4 items-center">
                    <div className="bg-amber-50 p-4 rounded-3xl text-center min-w-[70px]">
                      <p className="text-[10px] font-bold text-amber-600 uppercase">{new Date(app.date).toLocaleDateString('it-IT', { month: 'short' })}</p>
                      <p className="text-xl font-bold text-gray-900">{new Date(app.date).getDate()}</p>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">{app.services?.name}</h4>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">Staff: {app.team_member_name} • Cliente: {app.profiles?.full_name}</p>
                      <p className="text-xs text-amber-600 font-bold mt-1 uppercase tracking-widest">{new Date(app.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                    </div>
                  </div>
                  <button onClick={async () => { if(confirm('Cancellare?')) { await db.appointments.delete(app.id); refreshData(); }}} className="w-10 h-10 rounded-full bg-red-50 text-red-400 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"><i className="fas fa-trash-alt text-xs"></i></button>
                </div>
              )) : <div className="p-20 text-center bg-gray-50 rounded-[3rem] text-gray-300 font-bold uppercase text-[10px]">Agenda vuota</div>}
            </div>
        </div>
      )}

      <AIAssistant />
    </Layout>
  );
};

export default App;
