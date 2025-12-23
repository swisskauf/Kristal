
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
      alert("Un piccolo imprevisto nel rituale. Ti invitiamo a riprovare tra un istante.");
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

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todaysAppts = appointments.filter(a => a.date.includes(today));
    const revenue = todaysAppts.reduce((acc, a) => acc + (a.services?.price || 0), 0);
    return {
      count: todaysAppts.length,
      revenue,
      next: todaysAppts[0]
    };
  }, [appointments]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center space-y-6">
        <div className="w-16 h-16 border-4 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[11px] font-bold uppercase tracking-[0.5em] text-amber-600 animate-pulse">Kristal Atelier</p>
      </div>
    </div>
  );

  return (
    <Layout user={user} onLogout={handleLogout} onLoginClick={() => setIsAuthOpen(true)} activeTab={activeTab} setActiveTab={setActiveTab}>
      
      {isAuthOpen && (
        <div className="fixed inset-0 bg-white/98 backdrop-blur-3xl z-[500] overflow-y-auto animate-in fade-in duration-700">
          <div className="absolute top-12 right-12"><button onClick={() => setIsAuthOpen(false)} className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-900 transition-all shadow-sm"><i className="fas fa-times text-2xl"></i></button></div>
          <Auth onLogin={handleSessionUser} />
        </div>
      )}

      {/* DASHBOARD CLIENTE (L'ATELIER) */}
      {activeTab === 'dashboard' && (
        <div className="space-y-24 animate-in fade-in slide-in-from-bottom-5 duration-1000 pb-32">
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-12">
            <div className="space-y-6">
              <span className="text-amber-600 text-[12px] font-bold uppercase tracking-[0.5em] block border-l-2 border-amber-600 pl-6">Il Tempo è il vero lusso</span>
              <h2 className="text-7xl font-luxury font-bold leading-[1.1] text-gray-900 tracking-tight">
                {user ? `${timeGreeting}, ${user.fullName.split(' ')[0]}` : "Esplora Kristal"}<br/>
                <span className="text-gray-200 font-normal italic text-5xl">La tua firma di bellezza</span>
              </h2>
            </div>
            <button onClick={() => { if(!user) setIsAuthOpen(true); else setIsFormOpen(true); }} className="bg-black text-white px-14 py-8 rounded-[2.5rem] font-bold shadow-[0_30px_60px_rgba(0,0,0,0.12)] hover:bg-amber-700 hover:scale-105 transition-all duration-500 uppercase tracking-[0.2em] text-[11px]">
              Riserva un Istante
            </button>
          </header>

          <section className="space-y-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-10 border-b border-gray-100 pb-10">
               <h3 className="text-4xl font-luxury font-bold text-gray-900">Il Tuo Rituale</h3>
               <div className="flex gap-10 overflow-x-auto scrollbar-hide py-2">
                 {['Tutti', 'Donna', 'Colore', 'Trattamenti', 'Uomo', 'Estetica'].map(c => (
                   <button key={c} onClick={() => setFilterCategory(c)} className={`text-[12px] font-bold uppercase tracking-[0.3em] whitespace-nowrap transition-all duration-500 relative ${filterCategory === c ? 'text-amber-600' : 'text-gray-300 hover:text-gray-500'}`}>
                     {c}
                     {filterCategory === c && <div className="absolute -bottom-2 left-0 right-0 h-1 bg-amber-600 rounded-full"></div>}
                   </button>
                 ))}
               </div>
            </div>
            <div className="grid md:grid-cols-2 gap-10">
              {services.filter(s => filterCategory === 'Tutti' || s.category === filterCategory).map(s => (
                <button key={s.id} onClick={() => { if(!user) setIsAuthOpen(true); else { setSelectedAppointment({ service_id: s.id }); setIsFormOpen(true); } }} className="bg-white p-12 rounded-[5rem] border border-gray-50 flex justify-between items-center hover:shadow-[0_40px_80px_rgba(0,0,0,0.05)] hover:border-amber-200 transition-all duration-700 group text-left">
                  <div className="flex-1 pr-10">
                    <p className="text-[11px] font-bold text-amber-600 uppercase tracking-[0.2em] mb-4 opacity-70">{s.category}</p>
                    <h4 className="font-bold text-3xl text-gray-900 group-hover:text-amber-700 transition-colors mb-4 leading-tight">{s.name}</h4>
                    <p className="text-[13px] text-gray-400 font-light leading-relaxed italic opacity-80">"{s.description}"</p>
                  </div>
                  <div className="text-right border-l border-gray-100 pl-10 min-w-[140px]">
                     <p className="font-luxury font-bold text-4xl text-gray-900">CHF {s.price}</p>
                     <p className="text-[11px] text-gray-300 font-bold uppercase tracking-[0.2em] mt-3">{s.duration} MIN</p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* ADMIN: DASHBOARD VISIONE */}
      {activeTab === 'admin_dashboard' && user?.role === 'admin' && (
        <div className="space-y-20 animate-in fade-in duration-700 pb-32">
          <header className="space-y-4">
             <h2 className="text-6xl font-luxury font-bold text-gray-900">Visione Atelier</h2>
             <p className="text-[13px] text-gray-400 font-bold uppercase tracking-[0.4em]">Il polso dell'eccellenza oggi</p>
          </header>

          <div className="grid md:grid-cols-3 gap-10">
            <div className="bg-white p-12 rounded-[4rem] border border-gray-50 shadow-sm flex flex-col justify-between h-64">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Ospiti Oggi</p>
              <h4 className="text-7xl font-luxury font-bold text-amber-600">{stats.count}</h4>
              <p className="text-xs text-gray-400 font-medium italic">Accoglienza prevista</p>
            </div>
            <div className="bg-black p-12 rounded-[4rem] flex flex-col justify-between h-64 shadow-2xl">
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Volume Valore</p>
              <h4 className="text-6xl font-luxury font-bold text-white">CHF {stats.revenue}</h4>
              <p className="text-xs text-gray-500 font-medium italic">Performance odierna</p>
            </div>
            <div className="bg-amber-50 p-12 rounded-[4rem] border border-amber-100 flex flex-col justify-between h-64">
              <p className="text-[11px] font-bold text-amber-800 uppercase tracking-widest">Primo Ospite</p>
              <div>
                <h4 className="text-2xl font-bold text-gray-900 truncate">{stats.next?.profiles?.full_name || "Nessuno"}</h4>
                <p className="text-xs text-amber-700 font-bold uppercase tracking-widest mt-2">{stats.next ? new Date(stats.next.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : "Goditi la quiete"}</p>
              </div>
              <button onClick={() => setActiveTab('calendar')} className="text-[10px] font-bold text-amber-600 uppercase tracking-widest hover:underline text-left">Vedi Agenda</button>
            </div>
          </div>

          <section className="bg-white p-16 rounded-[5rem] border border-gray-50 shadow-sm space-y-12">
             <h3 className="text-3xl font-luxury font-bold">Prossime Accoglienze</h3>
             <div className="space-y-8">
               {appointments.slice(0, 4).map(app => (
                 <div key={app.id} className="flex items-center justify-between py-6 border-b border-gray-50 last:border-0 group">
                    <div className="flex items-center gap-10">
                      <span className="text-2xl font-luxury font-bold text-amber-600 w-24">{new Date(app.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                      <div>
                        <p className="text-lg font-bold text-gray-900 group-hover:text-amber-700 transition-colors">{app.profiles?.full_name}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">{app.services?.name} • Artist: {app.team_member_name}</p>
                      </div>
                    </div>
                    <button onClick={() => setViewingHistory(profiles.find(p => p.id === app.client_id))} className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 hover:bg-black hover:text-white transition-all"><i className="fas fa-arrow-right"></i></button>
                 </div>
               ))}
             </div>
          </section>
        </div>
      )}

      {/* ADMIN: IL TEAM (GLI ARTISTI) */}
      {activeTab === 'team_schedule' && user?.role === 'admin' && (
        <div className="space-y-20 animate-in fade-in duration-500 pb-32">
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-10">
            <div className="space-y-4">
              <h2 className="text-6xl font-luxury font-bold text-gray-900">Il Team d'Autore</h2>
              <p className="text-[13px] text-gray-400 font-bold uppercase tracking-[0.4em]">Il valore umano dietro Kristal</p>
            </div>
            <button onClick={() => setEditingMember({ name: '', role: '', start_hour: 8, end_hour: 19, unavailable_dates: [] })} className="bg-black text-white px-12 py-6 rounded-[2rem] font-bold text-[11px] uppercase tracking-widest hover:bg-amber-700 transition-all shadow-xl">Inserisci Talento</button>
          </header>

          <div className="grid lg:grid-cols-3 md:grid-cols-2 gap-12">
            {team.map(m => (
              <div key={m.name} className="bg-white rounded-[6rem] border border-gray-50 shadow-sm overflow-hidden flex flex-col group hover:shadow-[0_50px_100px_rgba(0,0,0,0.06)] transition-all duration-700">
                <div className="p-16 flex flex-col items-center text-center space-y-8">
                  <div className="relative group/avatar">
                    <img src={m.avatar || `https://ui-avatars.com/api/?name=${m.name}&background=f8f8f8&color=333`} className="w-40 h-40 rounded-full border-4 border-white shadow-2xl object-cover transition-transform group-hover/avatar:scale-110 duration-1000" />
                    <button onClick={() => setEditingMember(m)} className="absolute bottom-2 right-2 w-14 h-14 rounded-full bg-amber-600 text-white shadow-xl flex items-center justify-center hover:bg-black transition-all border-4 border-white"><i className="fas fa-pen text-sm"></i></button>
                  </div>
                  <div>
                    <h4 className="font-luxury font-bold text-4xl text-gray-900">{m.name}</h4>
                    <p className="text-[12px] text-amber-600 font-bold uppercase tracking-[0.3em] mt-2">{m.role}</p>
                  </div>
                </div>

                <div className="px-16 pb-16 space-y-12 flex-1">
                  <div className="bg-gray-50/50 p-10 rounded-[4rem] grid grid-cols-2 gap-10 text-center border border-gray-100/50">
                    <div className="space-y-3">
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Inizio Turno</p>
                      <p className="font-bold text-gray-900 text-2xl">{m.start_hour ?? 8}:00</p>
                    </div>
                    <div className="border-l border-gray-200 space-y-3">
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Fine Turno</p>
                      <p className="font-bold text-gray-900 text-2xl">{m.end_hour ?? 19}:00</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h5 className="text-[12px] font-bold text-gray-400 uppercase tracking-[0.3em] flex items-center gap-5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-600 animate-pulse"></span> 
                      Studio & Ricerca (Assenze)
                    </h5>
                    <div className="flex flex-wrap gap-3 min-h-[60px]">
                      {m.unavailable_dates?.length ? m.unavailable_dates.map(date => (
                        <div key={date} className="bg-white text-gray-800 px-6 py-3 rounded-full text-[11px] font-bold flex items-center gap-4 border border-gray-100 shadow-sm hover:border-red-100 transition-colors">
                          <i className="far fa-calendar-alt text-amber-600"></i>
                          {new Date(date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                          <button onClick={async () => {
                            const upd = { ...m, unavailable_dates: m.unavailable_dates?.filter(d => d !== date) };
                            await db.team.upsert(upd);
                            refreshData();
                          }} className="text-gray-300 hover:text-red-500 transition-colors"><i className="fas fa-times"></i></button>
                        </div>
                      )) : <p className="text-[11px] text-gray-300 italic py-4 text-center w-full">Dedizione totale ai nostri ospiti</p>}
                    </div>
                    <div className="flex gap-4 pt-6">
                      <input type="date" className="flex-1 bg-gray-50 border-none rounded-2xl p-5 text-[13px] font-bold outline-none focus:ring-2 focus:ring-amber-200 transition-all" onChange={(e) => setNewOffDate(e.target.value)} value={newOffDate} />
                      <button onClick={() => addOffDate(m.name)} className="bg-gray-900 text-white px-10 py-5 rounded-2xl text-[11px] font-bold uppercase tracking-widest hover:bg-black transition-all">Blocca</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODALI & CRM - DESIGN SYSTEM LUXURY (I NOSTRI OSPITI) */}
      {activeTab === 'clients' && user?.role === 'admin' && (
        <div className="space-y-20 animate-in fade-in duration-500 pb-32">
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-12">
            <div className="space-y-4">
              <h2 className="text-6xl font-luxury font-bold text-gray-900">I nostri Ospiti</h2>
              <p className="text-[13px] text-gray-400 font-bold uppercase tracking-[0.5em]">Custodi di storie e bellezza</p>
            </div>
            <div className="relative w-full md:w-[500px]">
              <i className="fas fa-search absolute left-10 top-1/2 -translate-y-1/2 text-gray-300 text-xl"></i>
              <input type="text" placeholder="Ricerca ospite..." className="w-full pl-20 pr-10 py-7 bg-white border border-gray-50 rounded-[3rem] text-sm outline-none focus:ring-2 focus:ring-amber-100 transition-all shadow-sm" value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} />
            </div>
          </header>

          <div className="grid gap-10">
            {profiles.filter(p => p.full_name?.toLowerCase().includes(clientSearch.toLowerCase())).map(p => (
              <div key={p.id} className="bg-white p-12 rounded-[5rem] border border-gray-50 flex flex-col md:flex-row items-center justify-between hover:shadow-[0_40px_80px_rgba(0,0,0,0.06)] hover:border-amber-200 transition-all duration-700 group">
                <div className="flex items-center gap-10 mb-8 md:mb-0">
                  <div className="relative">
                    <img src={p.avatar || `https://ui-avatars.com/api/?name=${p.full_name}&background=f8fafc&color=333`} className="w-28 h-28 rounded-full object-cover border-4 border-amber-50 shadow-2xl" />
                    <div className="absolute -bottom-1 -right-1 w-10 h-10 bg-green-500 border-4 border-white rounded-full"></div>
                  </div>
                  <div>
                    <h5 className="font-luxury font-bold text-4xl text-gray-900 group-hover:text-amber-700 transition-colors">{p.full_name}</h5>
                    <p className="text-[12px] text-gray-400 font-bold uppercase tracking-[0.4em] mt-3">
                      <i className="fas fa-phone-alt text-amber-600 mr-3 opacity-60"></i> {p.phone || 'Riservato'} 
                      <span className="mx-6 text-gray-100">|</span> 
                      <i className="fas fa-envelope text-amber-600 mr-3 opacity-60"></i> {p.email}
                    </p>
                  </div>
                </div>
                <button onClick={() => setViewingHistory(p)} className="px-14 py-6 bg-black text-white rounded-[2.5rem] text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-amber-700 transition-all shadow-2xl group-hover:scale-105 duration-500">
                  Scheda Percorso
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SCHEDA TECNICA (IL GIORNALE DI BELLEZZA) */}
      {viewingHistory && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-3xl z-[700] flex items-center justify-center p-10 overflow-y-auto animate-in fade-in duration-700">
          <div className="bg-white w-full max-w-7xl rounded-[6rem] p-20 shadow-2xl relative space-y-20 animate-in zoom-in-95 duration-1000 my-auto">
            <button onClick={() => { setViewingHistory(null); setEditingTreatmentIndex(null); }} className="absolute top-16 right-16 w-16 h-16 bg-gray-50 rounded-full text-gray-400 hover:text-gray-900 flex items-center justify-center transition-all shadow-sm"><i className="fas fa-times text-2xl"></i></button>

            <header className="flex flex-col md:flex-row items-center gap-14 border-b border-gray-100 pb-20">
              <img src={viewingHistory.avatar || `https://ui-avatars.com/api/?name=${viewingHistory.fullName}`} className="w-40 h-40 rounded-full border-4 border-amber-50 shadow-2xl" />
              <div className="text-center md:text-left space-y-3">
                <h3 className="text-6xl font-luxury font-bold text-gray-900 leading-tight tracking-tight">Il Percorso d'Autore</h3>
                <p className="text-amber-700 text-sm font-bold uppercase tracking-[0.5em]">Ospite d'Eccellenza: {viewingHistory.fullName}</p>
              </div>
            </header>

            <div className="grid lg:grid-cols-12 gap-20">
              <div className="lg:col-span-4 space-y-12">
                <div className="bg-amber-50/50 p-12 rounded-[5rem] border border-amber-100 shadow-sm space-y-10">
                  <h4 className="text-[13px] font-bold text-amber-800 uppercase tracking-[0.4em] flex items-center gap-4">
                    <i className="fas fa-feather-pointed"></i>
                    {editingTreatmentIndex !== null ? 'Aggiorna Nota' : 'Nuova Nota d\'Arte'}
                  </h4>
                  <div className="space-y-8">
                    <div className="space-y-4">
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block ml-3">Data Appuntamento</label>
                      <input type="date" className="w-full p-6 rounded-[2.5rem] bg-white border-none text-[13px] font-bold outline-none shadow-sm focus:ring-2 focus:ring-amber-200" value={newTreatment.date} onChange={e => setNewTreatment({...newTreatment, date: e.target.value})} />
                    </div>
                    <div className="space-y-4">
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block ml-3">Servizio Eseguito</label>
                      <input placeholder="Es. Riflessi di Luce + Trattamento Seta" className="w-full p-6 rounded-[2.5rem] bg-white border-none text-[13px] font-bold outline-none shadow-sm focus:ring-2 focus:ring-amber-200" value={newTreatment.service} onChange={e => setNewTreatment({...newTreatment, service: e.target.value})} />
                    </div>
                    <div className="space-y-4">
                      <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block ml-3">Note Tecniche & Formule</label>
                      <textarea placeholder="Le tue intuizioni preziose..." className="w-full p-8 rounded-[3.5rem] bg-white border-none text-[13px] h-56 outline-none shadow-sm focus:ring-2 focus:ring-amber-200 resize-none leading-relaxed italic" value={newTreatment.notes} onChange={e => setNewTreatment({...newTreatment, notes: e.target.value})} />
                    </div>
                    <button onClick={addOrUpdateTreatment} className="w-full py-7 bg-black text-white rounded-[2.5rem] font-bold uppercase text-[12px] tracking-[0.3em] shadow-[0_20px_40px_rgba(0,0,0,0.15)] hover:bg-amber-700 transition-all">
                      {editingTreatmentIndex !== null ? 'Aggiorna Storia' : 'Sigilla Momento'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-8 space-y-12">
                <h4 className="text-[13px] font-bold text-gray-400 uppercase tracking-[0.5em] pl-8 border-l-4 border-amber-600">Diario di Bellezza</h4>
                <div className="space-y-10 pr-6 custom-scrollbar">
                  {(viewingHistory.treatment_history || []).slice().reverse().map((record, i) => {
                    const originalIndex = (viewingHistory.treatment_history || []).length - 1 - i;
                    return (
                      <div key={originalIndex} className="bg-white p-14 border border-gray-50 shadow-sm rounded-[5rem] group relative hover:border-amber-200 hover:shadow-2xl transition-all duration-1000">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[12px] font-bold text-amber-600 block mb-4 uppercase tracking-[0.4em]">{new Date(record.date).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                            <h5 className="font-luxury font-bold text-4xl text-gray-900 mb-6">{record.service}</h5>
                          </div>
                          <div className="flex gap-5 opacity-0 group-hover:opacity-100 transition-all duration-700">
                            <button onClick={() => { setEditingTreatmentIndex(originalIndex); setNewTreatment(record); }} className="w-14 h-14 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center hover:bg-amber-600 hover:text-white transition-all shadow-sm"><i className="fas fa-edit text-sm"></i></button>
                            <button onClick={async () => {
                              if(confirm('Questa nota tecnica verrà perduta. Confermi?')) {
                                const updHist = viewingHistory.treatment_history?.filter((_, idx) => idx !== originalIndex);
                                await db.profiles.upsert({ ...viewingHistory, treatment_history: updHist });
                                setViewingHistory({ ...viewingHistory, treatment_history: updHist } as any);
                                refreshData();
                              }
                            }} className="w-14 h-14 rounded-full bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm"><i className="fas fa-trash-alt text-sm"></i></button>
                          </div>
                        </div>
                        <div className="mt-10 p-10 bg-gray-50/50 rounded-[3rem] text-[16px] text-gray-600 leading-relaxed italic border border-gray-50/50 font-light">
                          "{record.notes}"
                        </div>
                      </div>
                    );
                  })}
                  {(!viewingHistory.treatment_history || viewingHistory.treatment_history.length === 0) && (
                    <div className="py-40 text-center bg-gray-50/30 rounded-[6rem] border-2 border-dashed border-gray-100 flex flex-col items-center">
                       <i className="fas fa-spa text-gray-100 text-8xl mb-12 animate-pulse"></i>
                       <p className="text-gray-300 font-bold uppercase text-[13px] tracking-[0.6em]">Pronti a scrivere il primo capitolo</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODALE PRENOTAZIONE */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-3xl z-[700] flex items-center justify-center p-10 overflow-y-auto">
          <div className="bg-white w-full max-w-5xl rounded-[6rem] p-20 shadow-2xl relative animate-in zoom-in-95 duration-700 my-auto">
            <h3 className="text-5xl font-luxury font-bold text-gray-900 mb-16 text-center tracking-tight">Riserva il tuo tempo Kristal</h3>
            <AppointmentForm services={services} team={team} existingAppointments={appointments} onSave={saveAppointment} onCancel={() => setIsFormOpen(false)} initialData={selectedAppointment} isAdmin={user?.role === 'admin'} profiles={profiles} />
          </div>
        </div>
      )}

      {/* AGENDA ADMIN */}
      {activeTab === 'calendar' && user?.role === 'admin' && (
        <div className="space-y-20 animate-in fade-in duration-500 pb-32">
           <header className="space-y-4">
                <h2 className="text-6xl font-luxury font-bold text-gray-900">Agenda Atelier</h2>
                <p className="text-[13px] text-gray-400 font-bold uppercase tracking-[0.4em]">Il fluire degli ospiti oggi</p>
           </header>
            <div className="grid gap-8">
              {appointments.length > 0 ? appointments.map(app => (
                <div key={app.id} className="bg-white p-12 rounded-[4rem] border border-gray-50 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-10 hover:shadow-2xl hover:border-amber-200 transition-all duration-700 group">
                  <div className="flex gap-10 items-center">
                    <div className="bg-amber-600 p-8 rounded-[3rem] text-center min-w-[120px] shadow-2xl shadow-amber-200/50 group-hover:scale-105 transition-transform">
                      <p className="text-[11px] font-bold text-white/70 uppercase tracking-widest mb-1">{new Date(app.date).toLocaleDateString('it-IT', { month: 'short' })}</p>
                      <p className="text-4xl font-luxury font-bold text-white">{new Date(app.date).getDate()}</p>
                    </div>
                    <div>
                      <h4 className="font-luxury font-bold text-3xl text-gray-900 mb-2">{app.services?.name}</h4>
                      <p className="text-[12px] text-gray-400 font-bold uppercase tracking-[0.2em] flex items-center gap-4">
                        <span className="flex items-center gap-2"><i className="fas fa-user-circle text-amber-600"></i> {app.profiles?.full_name}</span>
                        <span className="text-gray-100">|</span> 
                        <span className="flex items-center gap-2"><i className="fas fa-hand-sparkles text-amber-600"></i> {app.team_member_name}</span>
                      </p>
                      <div className="mt-5 inline-flex items-center px-5 py-2.5 bg-gray-50 rounded-full text-[11px] font-bold text-amber-800 uppercase tracking-widest">
                        <i className="far fa-clock mr-3"></i> {new Date(app.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-5">
                    <button onClick={() => setViewingHistory(profiles.find(p => p.id === app.client_id))} className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center hover:bg-amber-600 hover:text-white transition-all shadow-sm"><i className="fas fa-file-signature text-lg"></i></button>
                    <button onClick={async () => { if(confirm('Desideri annullare questo rituale?')) { await db.appointments.delete(app.id); refreshData(); }}} className="w-16 h-16 rounded-full bg-red-50 text-red-400 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm"><i className="fas fa-trash-alt text-lg"></i></button>
                  </div>
                </div>
              )) : <div className="p-40 text-center bg-gray-50/50 rounded-[7rem] border-2 border-dashed border-gray-100 flex flex-col items-center"><i className="fas fa-calendar-alt text-gray-100 text-8xl mb-10"></i><p className="text-gray-300 font-bold uppercase text-[13px] tracking-[0.6em]">Agenda ancora da scrivere</p></div>}
            </div>
        </div>
      )}

      <AIAssistant />
    </Layout>
  );
};

export default App;
