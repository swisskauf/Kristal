
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

  const [editingMember, setEditingMember] = useState<any>(null);
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
          full_name: metadata.full_name || metadata.name || 'Nuovo Ospite',
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
      alert("Si è verificato un errore nel salvataggio dell'appuntamento.");
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
          <div className="absolute top-6 right-6"><button onClick={() => setIsAuthOpen(false)} className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"><i className="fas fa-times"></i></button></div>
          <Auth onLogin={handleSessionUser} />
        </div>
      )}

      {/* DASHBOARD CLIENTE */}
      {activeTab === 'dashboard' && (
        <div className="space-y-16 animate-in fade-in duration-700 pb-24">
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="space-y-4">
              <span className="text-amber-500 text-[10px] font-bold uppercase tracking-[0.3em] block">L'Atelier Kristal</span>
              <h2 className="text-5xl font-luxury font-bold leading-tight text-gray-900">
                {user ? `Bentornata, ${user.fullName.split(' ')[0]}!` : "Esplora la tua bellezza"}<br/>
                <span className="text-gray-300 font-normal italic">Un'esperienza di puro lusso</span>
              </h2>
            </div>
            <button onClick={() => { if(!user) setIsAuthOpen(true); else setIsFormOpen(true); }} className="bg-black text-white px-10 py-6 rounded-3xl font-bold shadow-2xl hover:bg-amber-600 hover:scale-105 transition-all duration-300">
              Prenota ora il tuo momento
            </button>
          </header>

          <section className="space-y-8">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
               <h3 className="text-2xl font-luxury font-bold">Collezione Trattamenti</h3>
               <div className="flex gap-4">
                 {['Tutti', 'Donna', 'Colore', 'Trattamenti'].map(c => (
                   <button key={c} onClick={() => setFilterCategory(c)} className={`text-[10px] font-bold uppercase tracking-widest ${filterCategory === c ? 'text-amber-500' : 'text-gray-300 hover:text-gray-500'}`}>{c}</button>
                 ))}
               </div>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {services.filter(s => filterCategory === 'Tutti' || s.category === filterCategory).map(s => (
                <button key={s.id} onClick={() => { if(!user) setIsAuthOpen(true); else { setSelectedAppointment({ service_id: s.id }); setIsFormOpen(true); } }} className="bg-white p-8 rounded-[3rem] border border-gray-50 flex justify-between items-center hover:shadow-2xl hover:border-amber-100 transition-all group text-left">
                  <div className="flex-1 pr-6">
                    <p className="text-[9px] font-bold text-amber-500 uppercase tracking-widest mb-1">{s.category}</p>
                    <h4 className="font-bold text-xl text-gray-900 group-hover:text-amber-600 transition-colors mb-2">{s.name}</h4>
                    <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">{s.description}</p>
                  </div>
                  <div className="text-right border-l border-gray-50 pl-6">
                     <p className="font-luxury font-bold text-2xl text-gray-900">CHF {s.price}</p>
                     <p className="text-[10px] text-gray-300 font-bold uppercase tracking-widest mt-1">{s.duration} min</p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* ADMIN: PROFESSIONAL STAFF ATELIER */}
      {activeTab === 'team_schedule' && user?.role === 'admin' && (
        <div className="space-y-12 animate-in fade-in duration-500 pb-20">
          <header className="flex justify-between items-end">
            <div className="space-y-2">
              <h2 className="text-4xl font-luxury font-bold text-gray-900">L'Atelier: Il Team</h2>
              <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest">Pianificazione eccellenza e accoglienza</p>
            </div>
            <button onClick={() => setEditingMember({ name: '', role: '', start_hour: 8, end_hour: 19, unavailable_dates: [] })} className="bg-black text-white px-8 py-4 rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-amber-600 transition-all shadow-xl">Aggiungi Collaboratore</button>
          </header>

          <div className="grid lg:grid-cols-3 md:grid-cols-2 gap-8">
            {team.map(m => (
              <div key={m.name} className="bg-white rounded-[4rem] border border-gray-50 shadow-sm overflow-hidden flex flex-col group hover:shadow-2xl transition-all duration-500">
                <div className="p-10 flex flex-col items-center text-center space-y-4">
                  <div className="relative">
                    <img src={m.avatar || `https://ui-avatars.com/api/?name=${m.name}`} className="w-28 h-28 rounded-full border-4 border-white shadow-xl object-cover" />
                    <button onClick={() => setEditingMember(m)} className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-white shadow-lg border border-gray-50 flex items-center justify-center text-amber-500 hover:bg-amber-500 hover:text-white transition-all"><i className="fas fa-pen text-xs"></i></button>
                  </div>
                  <div>
                    <h4 className="font-luxury font-bold text-2xl text-gray-900">{m.name}</h4>
                    <p className="text-[10px] text-amber-600 font-bold uppercase tracking-widest">{m.role}</p>
                  </div>
                </div>

                <div className="px-10 pb-10 space-y-8 flex-1">
                  <div className="bg-gray-50/50 p-6 rounded-[2.5rem] grid grid-cols-2 gap-6 text-center border border-gray-50">
                    <div className="space-y-1">
                      <p className="text-[9px] font-bold text-gray-300 uppercase tracking-widest">Inizio Turno</p>
                      <p className="font-bold text-gray-900 text-lg">{m.start_hour ?? 8}:00</p>
                    </div>
                    <div className="border-l border-gray-100 space-y-1">
                      <p className="text-[9px] font-bold text-gray-300 uppercase tracking-widest">Fine Turno</p>
                      <p className="font-bold text-gray-900 text-lg">{m.end_hour ?? 19}:00</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> 
                      Gestione Assenze
                    </h5>
                    <div className="flex flex-wrap gap-2 min-h-[40px]">
                      {m.unavailable_dates?.length ? m.unavailable_dates.map(date => (
                        <div key={date} className="bg-white text-gray-700 px-4 py-2 rounded-full text-[10px] font-bold flex items-center gap-3 border border-gray-100 shadow-sm">
                          {new Date(date).toLocaleDateString()}
                          <button onClick={async () => {
                            const upd = { ...m, unavailable_dates: m.unavailable_dates?.filter(d => d !== date) };
                            await db.team.upsert(upd);
                            refreshData();
                          }} className="text-red-400 hover:text-red-600"><i className="fas fa-times"></i></button>
                        </div>
                      )) : <p className="text-[10px] text-gray-300 italic py-2">Nessun periodo di ferie registrato</p>}
                    </div>
                    <div className="flex gap-2 pt-2">
                      <input type="date" className="flex-1 bg-gray-50 border-none rounded-xl p-3 text-[11px] font-bold outline-none focus:ring-1 focus:ring-amber-200" onChange={(e) => setNewOffDate(e.target.value)} value={newOffDate} />
                      <button onClick={() => addOffDate(m.name)} className="bg-gray-900 text-white px-6 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-black transition-colors">Blocca</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ADMIN: I NOSTRI OSPITI (CRM) */}
      {activeTab === 'clients' && user?.role === 'admin' && (
        <div className="space-y-12 animate-in fade-in duration-500 pb-20">
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="space-y-2">
              <h2 className="text-4xl font-luxury font-bold text-gray-900">I nostri Ospiti</h2>
              <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest">L'anima del salone Kristal</p>
            </div>
            <div className="relative w-full md:w-96">
              <i className="fas fa-search absolute left-6 top-1/2 -translate-y-1/2 text-gray-300"></i>
              <input type="text" placeholder="Ricerca ospite per nome o telefono..." className="w-full pl-14 pr-6 py-5 bg-white border border-gray-100 rounded-[2rem] text-sm outline-none focus:ring-2 focus:ring-amber-100 transition-all shadow-sm" value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} />
            </div>
          </header>

          <div className="grid gap-6">
            {filteredProfiles.map(p => (
              <div key={p.id} className="bg-white p-8 rounded-[3rem] border border-gray-50 flex items-center justify-between hover:shadow-2xl hover:border-amber-100 transition-all group">
                <div className="flex items-center gap-6">
                  <img src={p.avatar || `https://ui-avatars.com/api/?name=${p.full_name}`} className="w-20 h-20 rounded-full object-cover border-2 border-amber-50 shadow-lg" />
                  <div>
                    <h5 className="font-luxury font-bold text-2xl text-gray-900 group-hover:text-amber-600 transition-colors">{p.full_name}</h5>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">{p.phone || 'Privato'} • {p.email}</p>
                  </div>
                </div>
                <button onClick={() => setViewingHistory(p)} className="px-10 py-4 bg-black text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-amber-600 transition-all shadow-xl">Scheda Ospite</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SCHEDA TECNICA MODALE (VERSIONE LUXURY) */}
      {viewingHistory && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xl z-[600] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-6xl rounded-[4rem] p-12 shadow-2xl overflow-y-auto max-h-[90vh] relative space-y-12 animate-in zoom-in-95 duration-500">
            <button onClick={() => { setViewingHistory(null); setEditingTreatmentIndex(null); }} className="absolute top-10 right-10 w-12 h-12 rounded-full bg-gray-50 text-gray-400 hover:text-gray-900 flex items-center justify-center transition-all"><i className="fas fa-times text-lg"></i></button>

            <header className="flex items-center gap-8 border-b border-gray-50 pb-12">
              <img src={viewingHistory.avatar || `https://ui-avatars.com/api/?name=${viewingHistory.fullName}`} className="w-24 h-24 rounded-full border-4 border-amber-50 shadow-xl" />
              <div>
                <h3 className="text-4xl font-luxury font-bold text-gray-900">Scheda Tecnica d'Autore</h3>
                <p className="text-amber-600 text-xs font-bold uppercase tracking-[0.3em] mt-2">Ospite: {viewingHistory.fullName}</p>
              </div>
            </header>

            <div className="grid lg:grid-cols-12 gap-12">
              <div className="lg:col-span-4 space-y-8">
                <div className="bg-amber-50/50 p-8 rounded-[3rem] border border-amber-100 shadow-sm space-y-6">
                  <h4 className="text-[11px] font-bold text-amber-700 uppercase tracking-widest">{editingTreatmentIndex !== null ? 'Aggiorna Nota' : 'Nuova Nota di Bellezza'}</h4>
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Data Trattamento</label>
                      <input type="date" className="w-full p-4 rounded-2xl bg-white border-none text-xs font-bold outline-none shadow-inner" value={newTreatment.date} onChange={e => setNewTreatment({...newTreatment, date: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Servizio Eseguito</label>
                      <input placeholder="Es. Balayage Soft + Toner 9.1" className="w-full p-4 rounded-2xl bg-white border-none text-xs font-bold outline-none shadow-inner" value={newTreatment.service} onChange={e => setNewTreatment({...newTreatment, service: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Note Tecniche & Formule</label>
                      <textarea placeholder="Mix colore, tempi di posa, prodotti consigliati..." className="w-full p-4 rounded-2xl bg-white border-none text-xs h-40 outline-none shadow-inner resize-none" value={newTreatment.notes} onChange={e => setNewTreatment({...newTreatment, notes: e.target.value})} />
                    </div>
                    <button onClick={addOrUpdateTreatment} className="w-full py-5 bg-amber-600 text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest shadow-xl shadow-amber-100 hover:bg-black transition-all">
                      {editingTreatmentIndex !== null ? 'Aggiorna Record' : 'Salva in Archivio'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-8 space-y-8">
                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest border-l-4 border-amber-500 pl-4">Percorso di Bellezza</h4>
                <div className="space-y-6">
                  {(viewingHistory.treatment_history || []).slice().reverse().map((record, i) => {
                    const originalIndex = (viewingHistory.treatment_history || []).length - 1 - i;
                    return (
                      <div key={originalIndex} className="bg-white p-10 border border-gray-50 shadow-sm rounded-[3rem] group relative hover:border-amber-200 hover:shadow-xl transition-all duration-300">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] font-bold text-amber-500 block mb-2 uppercase tracking-widest">{new Date(record.date).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                            <h5 className="font-luxury font-bold text-2xl text-gray-900">{record.service}</h5>
                          </div>
                          <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-all">
                            <button onClick={() => { setEditingTreatmentIndex(originalIndex); setNewTreatment(record); }} className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center hover:bg-amber-600 hover:text-white transition-colors"><i className="fas fa-edit text-xs"></i></button>
                            <button onClick={async () => {
                              if(confirm('Sei sicuro di voler eliminare questa nota tecnica?')) {
                                const updHist = viewingHistory.treatment_history?.filter((_, idx) => idx !== originalIndex);
                                await db.profiles.upsert({ ...viewingHistory, treatment_history: updHist });
                                setViewingHistory({ ...viewingHistory, treatment_history: updHist } as any);
                                refreshData();
                              }
                            }} className="w-10 h-10 rounded-full bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"><i className="fas fa-trash text-xs"></i></button>
                          </div>
                        </div>
                        <div className="mt-8 p-6 bg-gray-50/50 rounded-3xl text-[13px] text-gray-600 leading-relaxed italic border border-gray-50">
                          "{record.notes}"
                        </div>
                      </div>
                    );
                  })}
                  {(!viewingHistory.treatment_history || viewingHistory.treatment_history.length === 0) && (
                    <div className="py-24 text-center bg-gray-50/50 rounded-[4rem] border-2 border-dashed border-gray-100">
                       <i className="fas fa-feather-pointed text-gray-200 text-5xl mb-6"></i>
                       <p className="text-gray-400 font-bold uppercase text-[10px] tracking-[0.3em]">Nessun record in archivio per questo ospite</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Altre modali operative seguono il design system */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xl z-[600] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-4xl rounded-[4rem] p-12 shadow-2xl overflow-y-auto max-h-[95vh] animate-in zoom-in-95 duration-500">
            <h3 className="text-3xl font-luxury font-bold text-gray-900 mb-10 text-center">Riserva il tuo momento di bellezza</h3>
            <AppointmentForm services={services} team={team} existingAppointments={appointments} onSave={saveAppointment} onCancel={() => setIsFormOpen(false)} initialData={selectedAppointment} isAdmin={user?.role === 'admin'} profiles={profiles} />
          </div>
        </div>
      )}

      {/* AGENDA ADMIN */}
      {activeTab === 'calendar' && user?.role === 'admin' && (
        <div className="space-y-12 animate-in fade-in duration-500 pb-24">
           <header className="flex justify-between items-end">
              <div className="space-y-2">
                <h2 className="text-4xl font-luxury font-bold text-gray-900">Agenda Kristal</h2>
                <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest">Visione d'insieme del salone</p>
              </div>
           </header>
            <div className="grid gap-6">
              {appointments.length > 0 ? appointments.map(app => (
                <div key={app.id} className="bg-white p-10 rounded-[3rem] border border-gray-50 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-8 hover:shadow-xl transition-all">
                  <div className="flex gap-8 items-center">
                    <div className="bg-amber-500 p-6 rounded-[2.5rem] text-center min-w-[100px] shadow-lg shadow-amber-200">
                      <p className="text-[10px] font-bold text-white uppercase tracking-widest mb-1">{new Date(app.date).toLocaleDateString('it-IT', { month: 'short' })}</p>
                      <p className="text-3xl font-luxury font-bold text-white">{new Date(app.date).getDate()}</p>
                    </div>
                    <div>
                      <h4 className="font-luxury font-bold text-2xl text-gray-900 mb-1">{app.services?.name}</h4>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                        <i className="fas fa-user-circle text-amber-500 mr-2"></i> {app.profiles?.full_name} 
                        <span className="mx-3 text-gray-200">|</span> 
                        <i className="fas fa-hand-sparkles text-amber-500 mr-2"></i> Artist: {app.team_member_name}
                      </p>
                      <div className="mt-4 inline-flex items-center px-4 py-2 bg-gray-50 rounded-full text-[10px] font-bold text-amber-700 uppercase tracking-widest">
                        <i className="far fa-clock mr-2"></i> {new Date(app.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setViewingHistory(profiles.find(p => p.id === app.client_id))} className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center hover:bg-amber-500 hover:text-white transition-all shadow-sm"><i className="fas fa-file-signature"></i></button>
                    <button onClick={async () => { if(confirm('Desideri annullare questo appuntamento?')) { await db.appointments.delete(app.id); refreshData(); }}} className="w-12 h-12 rounded-full bg-red-50 text-red-400 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm"><i className="fas fa-trash-alt"></i></button>
                  </div>
                </div>
              )) : <div className="p-32 text-center bg-gray-50/50 rounded-[5rem] border-2 border-dashed border-gray-100"><p className="text-gray-300 font-bold uppercase text-[11px] tracking-[0.4em]">Agenda ancora da scrivere</p></div>}
            </div>
        </div>
      )}

      <AIAssistant />
    </Layout>
  );
};

export default App;
