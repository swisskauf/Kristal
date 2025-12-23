
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

  const timeGreeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Buongiorno";
    if (hour < 18) return "Buon pomeriggio";
    return "Buonasera";
  }, []);

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
          full_name: metadata.full_name || metadata.name || 'Ospite Kristal',
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
      alert("La prenotazione ha incontrato un piccolo ostacolo. Riprova tra un istante.");
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
      <div className="flex flex-col items-center space-y-4">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-amber-500">Kristal Salon</p>
      </div>
    </div>
  );

  return (
    <Layout user={user} onLogout={handleLogout} onLoginClick={() => setIsAuthOpen(true)} activeTab={activeTab} setActiveTab={setActiveTab}>
      
      {isAuthOpen && (
        <div className="fixed inset-0 bg-white/95 backdrop-blur-xl z-[300] overflow-y-auto">
          <div className="absolute top-10 right-10"><button onClick={() => setIsAuthOpen(false)} className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-900 transition-all shadow-sm"><i className="fas fa-times text-xl"></i></button></div>
          <Auth onLogin={handleSessionUser} />
        </div>
      )}

      {/* DASHBOARD CLIENTE */}
      {activeTab === 'dashboard' && (
        <div className="space-y-20 animate-in fade-in duration-1000 pb-24">
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-10">
            <div className="space-y-5">
              <span className="text-amber-500 text-[11px] font-bold uppercase tracking-[0.4em] block border-l-2 border-amber-500 pl-4">L'Eccellenza a tua disposizione</span>
              <h2 className="text-6xl font-luxury font-bold leading-tight text-gray-900">
                {user ? `${timeGreeting}, ${user.fullName.split(' ')[0]}!` : "Scopri Kristal"}<br/>
                <span className="text-gray-300 font-normal italic text-4xl">La tua oasi di bellezza</span>
              </h2>
            </div>
            <button onClick={() => { if(!user) setIsAuthOpen(true); else setIsFormOpen(true); }} className="bg-black text-white px-12 py-7 rounded-[2rem] font-bold shadow-[0_20px_40px_rgba(0,0,0,0.1)] hover:bg-amber-600 hover:scale-105 transition-all duration-500 uppercase tracking-widest text-[11px]">
              Riserva il tuo tempo
            </button>
          </header>

          <section className="space-y-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-gray-100 pb-8">
               <h3 className="text-3xl font-luxury font-bold">Collezione Servizi</h3>
               <div className="flex gap-6 overflow-x-auto scrollbar-hide">
                 {['Tutti', 'Donna', 'Colore', 'Trattamenti', 'Uomo', 'Estetica'].map(c => (
                   <button key={c} onClick={() => setFilterCategory(c)} className={`text-[11px] font-bold uppercase tracking-[0.2em] whitespace-nowrap transition-all ${filterCategory === c ? 'text-amber-500 border-b-2 border-amber-500 pb-1' : 'text-gray-300 hover:text-gray-500'}`}>{c}</button>
                 ))}
               </div>
            </div>
            <div className="grid md:grid-cols-2 gap-8">
              {services.filter(s => filterCategory === 'Tutti' || s.category === filterCategory).map(s => (
                <button key={s.id} onClick={() => { if(!user) setIsAuthOpen(true); else { setSelectedAppointment({ service_id: s.id }); setIsFormOpen(true); } }} className="bg-white p-10 rounded-[4rem] border border-gray-50 flex justify-between items-center hover:shadow-[0_30px_60px_rgba(0,0,0,0.04)] hover:border-amber-100 transition-all duration-500 group text-left">
                  <div className="flex-1 pr-8">
                    <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-2">{s.category}</p>
                    <h4 className="font-bold text-2xl text-gray-900 group-hover:text-amber-600 transition-colors mb-3 leading-tight">{s.name}</h4>
                    <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed italic">"{s.description}"</p>
                  </div>
                  <div className="text-right border-l border-gray-100 pl-8 min-w-[120px]">
                     <p className="font-luxury font-bold text-3xl text-gray-900">CHF {s.price}</p>
                     <p className="text-[10px] text-gray-300 font-bold uppercase tracking-widest mt-2">{s.duration} min</p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* ADMIN: IL TEAM */}
      {activeTab === 'team_schedule' && user?.role === 'admin' && (
        <div className="space-y-16 animate-in fade-in duration-500 pb-20">
          <header className="flex justify-between items-end">
            <div className="space-y-3">
              <h2 className="text-5xl font-luxury font-bold text-gray-900">Gli Artisti</h2>
              <p className="text-[12px] text-gray-400 font-bold uppercase tracking-[0.3em]">Pianificazione e disponibilità</p>
            </div>
            <button onClick={() => setEditingMember({ name: '', role: '', start_hour: 8, end_hour: 19, unavailable_dates: [] })} className="bg-black text-white px-10 py-5 rounded-[2rem] font-bold text-[11px] uppercase tracking-widest hover:bg-amber-600 transition-all shadow-xl">Nuovo Talento</button>
          </header>

          <div className="grid lg:grid-cols-3 md:grid-cols-2 gap-10">
            {team.map(m => (
              <div key={m.name} className="bg-white rounded-[5rem] border border-gray-50 shadow-sm overflow-hidden flex flex-col group hover:shadow-2xl transition-all duration-700">
                <div className="p-12 flex flex-col items-center text-center space-y-5">
                  <div className="relative group/avatar">
                    <img src={m.avatar || `https://ui-avatars.com/api/?name=${m.name}&background=f5f5f5&color=333`} className="w-32 h-32 rounded-full border-4 border-white shadow-2xl object-cover transition-transform group-hover/avatar:scale-105" />
                    <button onClick={() => setEditingMember(m)} className="absolute bottom-1 right-1 w-12 h-12 rounded-full bg-amber-500 text-white shadow-lg flex items-center justify-center hover:bg-black transition-all border-4 border-white"><i className="fas fa-pen text-xs"></i></button>
                  </div>
                  <div>
                    <h4 className="font-luxury font-bold text-3xl text-gray-900">{m.name}</h4>
                    <p className="text-[11px] text-amber-600 font-bold uppercase tracking-[0.2em] mt-1">{m.role}</p>
                  </div>
                </div>

                <div className="px-12 pb-12 space-y-10 flex-1">
                  <div className="bg-amber-50/30 p-8 rounded-[3rem] grid grid-cols-2 gap-8 text-center border border-amber-50/50">
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ricevimento</p>
                      <p className="font-bold text-gray-900 text-xl">{m.start_hour ?? 8}:00</p>
                    </div>
                    <div className="border-l border-amber-100 space-y-2">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Congedo</p>
                      <p className="font-bold text-gray-900 text-xl">{m.end_hour ?? 19}:00</p>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <h5 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-4">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span> 
                      Percorso Formativo / Riposo
                    </h5>
                    <div className="flex flex-wrap gap-2.5 min-h-[50px]">
                      {m.unavailable_dates?.length ? m.unavailable_dates.map(date => (
                        <div key={date} className="bg-white text-gray-800 px-5 py-2.5 rounded-full text-[11px] font-bold flex items-center gap-3 border border-gray-100 shadow-sm hover:border-red-100 transition-colors">
                          <i className="far fa-calendar-times text-amber-500"></i>
                          {new Date(date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                          <button onClick={async () => {
                            const upd = { ...m, unavailable_dates: m.unavailable_dates?.filter(d => d !== date) };
                            await db.team.upsert(upd);
                            refreshData();
                          }} className="text-gray-300 hover:text-red-500 transition-colors"><i className="fas fa-times"></i></button>
                        </div>
                      )) : <p className="text-[10px] text-gray-300 italic py-3 text-center w-full">Sempre presente per i nostri ospiti</p>}
                    </div>
                    <div className="flex gap-3 pt-4">
                      <input type="date" className="flex-1 bg-gray-50 border-none rounded-2xl p-4 text-[12px] font-bold outline-none focus:ring-2 focus:ring-amber-200" onChange={(e) => setNewOffDate(e.target.value)} value={newOffDate} />
                      <button onClick={() => addOffDate(m.name)} className="bg-gray-900 text-white px-8 py-4 rounded-2xl text-[11px] font-bold uppercase tracking-widest hover:bg-black transition-all">Blocca</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ADMIN: I NOSTRI OSPITI */}
      {activeTab === 'clients' && user?.role === 'admin' && (
        <div className="space-y-16 animate-in fade-in duration-500 pb-20">
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-10">
            <div className="space-y-3">
              <h2 className="text-5xl font-luxury font-bold text-gray-900">I nostri Ospiti</h2>
              <p className="text-[12px] text-gray-400 font-bold uppercase tracking-[0.4em]">Il cuore pulsante di Kristal</p>
            </div>
            <div className="relative w-full md:w-[450px]">
              <i className="fas fa-search absolute left-8 top-1/2 -translate-y-1/2 text-gray-300 text-lg"></i>
              <input type="text" placeholder="Ricerca ospite..." className="w-full pl-16 pr-8 py-6 bg-white border border-gray-50 rounded-[2.5rem] text-sm outline-none focus:ring-2 focus:ring-amber-100 transition-all shadow-sm" value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} />
            </div>
          </header>

          <div className="grid gap-8">
            {filteredProfiles.map(p => (
              <div key={p.id} className="bg-white p-10 rounded-[4rem] border border-gray-50 flex flex-col md:flex-row items-center justify-between hover:shadow-2xl hover:border-amber-100 transition-all duration-500 group">
                <div className="flex items-center gap-8 mb-6 md:mb-0">
                  <div className="relative">
                    <img src={p.avatar || `https://ui-avatars.com/api/?name=${p.full_name}&background=f8fafc&color=94a3b8`} className="w-24 h-24 rounded-full object-cover border-4 border-amber-50 shadow-xl" />
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-500 border-4 border-white rounded-full"></div>
                  </div>
                  <div>
                    <h5 className="font-luxury font-bold text-3xl text-gray-900 group-hover:text-amber-600 transition-colors">{p.full_name}</h5>
                    <p className="text-[11px] text-gray-400 font-bold uppercase tracking-[0.3em] mt-2">
                      <i className="fas fa-phone-alt text-amber-500 mr-2 opacity-50"></i> {p.phone || 'Privato'} 
                      <span className="mx-4 text-gray-100">|</span> 
                      <i className="fas fa-envelope text-amber-500 mr-2 opacity-50"></i> {p.email}
                    </p>
                  </div>
                </div>
                <button onClick={() => setViewingHistory(p)} className="px-12 py-5 bg-black text-white rounded-[2rem] text-[11px] font-bold uppercase tracking-widest hover:bg-amber-600 transition-all shadow-xl group-hover:scale-105">
                  Scheda Tecnica
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODALI - DESIGN SYSTEM LUXURY */}
      {viewingHistory && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-2xl z-[600] flex items-center justify-center p-8 overflow-y-auto">
          <div className="bg-white w-full max-w-7xl rounded-[5rem] p-16 shadow-2xl relative space-y-16 animate-in zoom-in-95 duration-500 my-auto">
            <button onClick={() => { setViewingHistory(null); setEditingTreatmentIndex(null); }} className="absolute top-12 right-12 w-14 h-14 bg-gray-50 rounded-full text-gray-400 hover:text-gray-900 flex items-center justify-center transition-all shadow-sm"><i className="fas fa-times text-xl"></i></button>

            <header className="flex flex-col md:flex-row items-center gap-10 border-b border-gray-100 pb-16">
              <img src={viewingHistory.avatar || `https://ui-avatars.com/api/?name=${viewingHistory.fullName}`} className="w-32 h-32 rounded-full border-4 border-amber-500 shadow-2xl" />
              <div className="text-center md:text-left">
                <h3 className="text-5xl font-luxury font-bold text-gray-900">Il Tuo Percorso d'Autore</h3>
                <p className="text-amber-600 text-sm font-bold uppercase tracking-[0.4em] mt-3">Ospite d'Onore: {viewingHistory.fullName}</p>
              </div>
            </header>

            <div className="grid lg:grid-cols-12 gap-16">
              <div className="lg:col-span-4 space-y-10">
                <div className="bg-amber-50/40 p-10 rounded-[4rem] border border-amber-100 shadow-sm space-y-8">
                  <h4 className="text-[12px] font-bold text-amber-800 uppercase tracking-[0.3em] flex items-center gap-3">
                    <i className="fas fa-feather-pointed"></i>
                    {editingTreatmentIndex !== null ? 'Aggiorna Nota' : 'Nuova Nota d\'Arte'}
                  </h4>
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block ml-2">Data Appuntamento</label>
                      <input type="date" className="w-full p-5 rounded-[2rem] bg-white border-none text-xs font-bold outline-none shadow-sm focus:ring-2 focus:ring-amber-200" value={newTreatment.date} onChange={e => setNewTreatment({...newTreatment, date: e.target.value})} />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block ml-2">Servizio Eseguito</label>
                      <input placeholder="Es. Riflessi di Luce + Trattamento Seta" className="w-full p-5 rounded-[2rem] bg-white border-none text-xs font-bold outline-none shadow-sm focus:ring-2 focus:ring-amber-200" value={newTreatment.service} onChange={e => setNewTreatment({...newTreatment, service: e.target.value})} />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block ml-2">Dettagli & Formule</label>
                      <textarea placeholder="Le tue note preziose..." className="w-full p-6 rounded-[3rem] bg-white border-none text-xs h-48 outline-none shadow-sm focus:ring-2 focus:ring-amber-200 resize-none leading-relaxed" value={newTreatment.notes} onChange={e => setNewTreatment({...newTreatment, notes: e.target.value})} />
                    </div>
                    <button onClick={addOrUpdateTreatment} className="w-full py-6 bg-black text-white rounded-[2rem] font-bold uppercase text-[11px] tracking-[0.2em] shadow-2xl hover:bg-amber-600 transition-all">
                      {editingTreatmentIndex !== null ? 'Aggiorna Percorso' : 'Sigilla Nota'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-8 space-y-10">
                <h4 className="text-[12px] font-bold text-gray-400 uppercase tracking-[0.4em] pl-6 border-l-4 border-amber-500">Cronologia di Bellezza</h4>
                <div className="space-y-8 pr-4">
                  {(viewingHistory.treatment_history || []).slice().reverse().map((record, i) => {
                    const originalIndex = (viewingHistory.treatment_history || []).length - 1 - i;
                    return (
                      <div key={originalIndex} className="bg-white p-12 border border-gray-50 shadow-sm rounded-[4rem] group relative hover:border-amber-200 hover:shadow-2xl transition-all duration-700">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[11px] font-bold text-amber-500 block mb-3 uppercase tracking-[0.3em]">{new Date(record.date).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                            <h5 className="font-luxury font-bold text-3xl text-gray-900 mb-4">{record.service}</h5>
                          </div>
                          <div className="flex gap-4 opacity-0 group-hover:opacity-100 transition-all duration-500">
                            <button onClick={() => { setEditingTreatmentIndex(originalIndex); setNewTreatment(record); }} className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center hover:bg-amber-500 hover:text-white transition-all shadow-sm"><i className="fas fa-edit text-sm"></i></button>
                            <button onClick={async () => {
                              if(confirm('Questa nota tecnica verrà perduta. Confermi?')) {
                                const updHist = viewingHistory.treatment_history?.filter((_, idx) => idx !== originalIndex);
                                await db.profiles.upsert({ ...viewingHistory, treatment_history: updHist });
                                setViewingHistory({ ...viewingHistory, treatment_history: updHist } as any);
                                refreshData();
                              }
                            }} className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm"><i className="fas fa-trash-alt text-sm"></i></button>
                          </div>
                        </div>
                        <div className="mt-8 p-8 bg-gray-50/50 rounded-[2.5rem] text-[15px] text-gray-600 leading-relaxed italic border border-gray-50/50 font-light">
                          "{record.notes}"
                        </div>
                      </div>
                    );
                  })}
                  {(!viewingHistory.treatment_history || viewingHistory.treatment_history.length === 0) && (
                    <div className="py-32 text-center bg-gray-50/30 rounded-[5rem] border-2 border-dashed border-gray-100 flex flex-col items-center">
                       <i className="fas fa-spa text-gray-100 text-7xl mb-10"></i>
                       <p className="text-gray-300 font-bold uppercase text-[12px] tracking-[0.5em]">Il primo capitolo della tua storia è pronto per essere scritto</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {isFormOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-2xl z-[600] flex items-center justify-center p-8 overflow-y-auto">
          <div className="bg-white w-full max-w-5xl rounded-[5rem] p-16 shadow-2xl relative animate-in zoom-in-95 duration-500 my-auto">
            <h3 className="text-4xl font-luxury font-bold text-gray-900 mb-12 text-center">Riserva il tuo istante Kristal</h3>
            <AppointmentForm services={services} team={team} existingAppointments={appointments} onSave={saveAppointment} onCancel={() => setIsFormOpen(false)} initialData={selectedAppointment} isAdmin={user?.role === 'admin'} profiles={profiles} />
          </div>
        </div>
      )}

      <AIAssistant />
    </Layout>
  );
};

export default App;
