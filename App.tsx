
import React, { useState, useEffect, useMemo } from 'react';
import Layout from './components/Layout';
import Auth from './components/Auth';
import AIAssistant from './components/AIAssistant';
import AppointmentForm from './components/AppointmentForm';
import ServiceForm from './components/ServiceForm';
import TeamManagement from './components/TeamManagement';
import TeamPlanning from './components/TeamPlanning';
import { supabase, db } from './services/supabase';
import { Service, User, TeamMember, Appointment, TechnicalSheet } from './types';
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
  const [isServiceFormOpen, setIsServiceFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [viewingGuest, setViewingGuest] = useState<any | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<any | undefined>();
  const [clientSearch, setClientSearch] = useState('');
  const [newSheet, setNewSheet] = useState({ category: 'Colore', content: '' });

  const isAdmin = user?.role === 'admin';
  const isCollaborator = user?.role === 'collaborator';

  const businessStats = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0,0,0,0);

    const confirmed = appointments.filter(a => a.status === 'confirmed');
    const getRevenue = (appts: any[]) => appts.reduce((acc, a) => acc + (a.services?.price || 0), 0);

    return {
      global: {
        daily: getRevenue(confirmed.filter(a => a.date.startsWith(todayStr))),
        weekly: getRevenue(confirmed.filter(a => new Date(a.date) >= startOfWeek)),
        monthly: getRevenue(confirmed.filter(a => {
          const d = new Date(a.date);
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        })),
        yearly: getRevenue(confirmed.filter(a => new Date(a.date).getFullYear() === now.getFullYear()))
      },
      team: team.map(m => {
        const mAppts = confirmed.filter(a => a.team_member_name === m.name);
        const vacationUsed = (m.absences_json || [])
          .filter(abs => abs.type === 'vacation')
          .reduce((acc, abs) => {
            const s = new Date(abs.startDate);
            const e = new Date(abs.endDate);
            return acc + (Math.ceil((e.getTime() - s.getTime()) / 86400000) + 1);
          }, 0);

        return {
          name: m.name,
          avatar: m.avatar,
          daily: getRevenue(mAppts.filter(a => a.date.startsWith(todayStr))),
          weekly: getRevenue(mAppts.filter(a => new Date(a.date) >= startOfWeek)),
          monthly: getRevenue(mAppts.filter(a => {
            const d = new Date(a.date);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
          })),
          yearly: getRevenue(mAppts.filter(a => new Date(a.date).getFullYear() === now.getFullYear())),
          vacationRemaining: (m.total_vacation_days || 25) - vacationUsed,
          totalVacation: m.total_vacation_days || 25
        };
      })
    };
  }, [appointments, team]);

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
        if (session?.user) {
          const profile = await db.profiles.get(session.user.id);
          if (profile) {
            setUser({
              id: session.user.id,
              email: profile.email || session.user.email!,
              fullName: profile.full_name || 'Ospite',
              phone: profile.phone || '',
              role: profile.role || 'client',
              avatar: profile.avatar
            });
          }
        }
      } catch (e) {
        console.error("Auth init error", e);
      } finally {
        setLoading(false);
      }
    };
    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const profile = await db.profiles.get(session.user.id);
        if (profile) {
          setUser({
            id: session.user.id,
            email: profile.email || session.user.email!,
            fullName: profile.full_name || 'Ospite',
            phone: profile.phone || '',
            role: profile.role || 'client',
            avatar: profile.avatar
          });
        }
      } else {
        setUser(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const refreshData = async () => {
    try {
      const [svcs, tm, appts] = await Promise.all([
        db.services.getAll().catch(() => []),
        db.team.getAll().catch(() => []),
        db.appointments.getAll().catch(() => [])
      ]);
      
      if (svcs.length) setServices(svcs);
      if (tm.length) setTeam(tm);
      setAppointments(appts);

      if (isAdmin) {
        const profs = await db.profiles.getAll().catch(() => []);
        setProfiles(profs);
      }
    } catch (e) {
      console.error("Refresh Data error", e);
    }
  };

  useEffect(() => {
    if (!loading) refreshData();
  }, [loading, user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setActiveTab('dashboard');
  };

  const handleUpdateRole = async (profileId: string, newRole: any) => {
    const p = profiles.find(p => p.id === profileId);
    if (!p) return;
    try {
      await db.profiles.upsert({ 
        ...p, 
        role: newRole 
      });
      await refreshData();
      if (viewingGuest && viewingGuest.id === profileId) setViewingGuest({ ...viewingGuest, role: newRole });
    } catch (e: any) {
      alert("Errore aggiornamento ruolo: " + e.message);
    }
  };

  const handleToggleVacation = async (memberName: string, date: string) => {
    const member = team.find(m => m.name === memberName);
    if (!member) return;
    let updatedDates = [...(member.unavailable_dates || [])];
    if (updatedDates.includes(date)) {
      updatedDates = updatedDates.filter(d => d !== date);
    } else {
      updatedDates.push(date);
    }
    try {
      await db.team.upsert({ ...member, unavailable_dates: updatedDates });
      await refreshData();
    } catch (e) {
      alert("Errore salvataggio vacanze");
    }
  };

  const handleAddTechnicalSheet = async () => {
    if (!viewingGuest || !newSheet.content) return;
    const sheet: TechnicalSheet = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString(),
      category: newSheet.category,
      content: newSheet.content
    };
    const updatedSheets = [sheet, ...(viewingGuest.technical_sheets || [])];
    try {
      const updatedProfile = { ...viewingGuest, technical_sheets: updatedSheets };
      await db.profiles.upsert(updatedProfile);
      setViewingGuest(updatedProfile);
      setNewSheet({ category: 'Colore', content: '' });
      await refreshData();
    } catch (e) {
      alert("Errore salvataggio scheda tecnica");
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600">Kristal</p>
      </div>
    </div>
  );

  return (
    <>
      <Layout user={user} onLogout={handleLogout} onLoginClick={() => setIsAuthOpen(true)} activeTab={activeTab} setActiveTab={setActiveTab}>
        
        {activeTab === 'dashboard' && (
          <div className="space-y-12 animate-in fade-in duration-700">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <p className="text-amber-600 text-[10px] font-bold uppercase tracking-[0.3em] mb-2">{timeGreeting}</p>
                <h2 className="text-5xl font-luxury font-bold text-gray-900 tracking-tighter">
                  {user ? user.fullName.split(' ')[0] : 'Benvenuti'}
                </h2>
              </div>
              {isAdmin && <span className="px-4 py-2 bg-gray-900 text-white text-[8px] font-bold uppercase rounded-full tracking-widest">Business Intelligence</span>}
            </header>

            {isAdmin && (
              <div className="space-y-10">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Oggi', value: businessStats.global.daily, color: 'amber' },
                    { label: 'Settimana', value: businessStats.global.weekly, color: 'gray' },
                    { label: 'Mese', value: businessStats.global.monthly, color: 'gray' },
                    { label: 'Anno', value: businessStats.global.yearly, color: 'black' },
                  ].map((stat, i) => (
                    <div key={i} className={`p-6 rounded-[2rem] border border-gray-50 shadow-sm transition-all hover:scale-[1.02] ${stat.color === 'black' ? 'bg-black text-white' : stat.color === 'amber' ? 'bg-amber-50 border-amber-100' : 'bg-white'}`}>
                      <p className={`text-[8px] font-bold uppercase tracking-widest mb-2 ${stat.color === 'black' ? 'text-amber-500' : 'text-gray-400'}`}>{stat.label}</p>
                      <h3 className="text-2xl font-luxury font-bold">CHF {stat.value}</h3>
                    </div>
                  ))}
                </div>

                <div className="bg-white p-8 md:p-10 rounded-[3.5rem] border border-gray-50 shadow-sm overflow-hidden">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-8">Performance & HR Artisti</h3>
                  <div className="overflow-x-auto scrollbar-hide">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-gray-50">
                          <th className="pb-6 text-[9px] font-bold uppercase text-gray-400 tracking-widest">Artista</th>
                          <th className="pb-6 text-[9px] font-bold uppercase text-gray-400 tracking-widest text-center">Oggi</th>
                          <th className="pb-6 text-[9px] font-bold uppercase text-gray-400 tracking-widest text-center">Sett.</th>
                          <th className="pb-6 text-[9px] font-bold uppercase text-gray-400 tracking-widest text-center">Mese</th>
                          <th className="pb-6 text-[9px] font-bold uppercase text-gray-400 tracking-widest text-center">Anno</th>
                          <th className="pb-6 text-[9px] font-bold uppercase text-gray-400 tracking-widest text-right">Ferie Residue</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {businessStats.team.map(m => (
                          <tr key={m.name} className="group hover:bg-gray-50/50 transition-colors">
                            <td className="py-6">
                              <div className="flex items-center gap-3">
                                <img src={m.avatar || `https://ui-avatars.com/api/?name=${m.name}`} className="w-8 h-8 rounded-full shadow-sm grayscale group-hover:grayscale-0 transition-all" />
                                <span className="font-bold text-sm">{m.name}</span>
                              </div>
                            </td>
                            <td className="py-6 text-center font-luxury font-bold text-sm">CHF {m.daily}</td>
                            <td className="py-6 text-center font-luxury text-sm">CHF {m.weekly}</td>
                            <td className="py-6 text-center font-luxury font-bold text-sm text-amber-600">CHF {m.monthly}</td>
                            <td className="py-6 text-center font-luxury text-sm">CHF {m.yearly}</td>
                            <td className="py-6 text-right font-bold text-[10px]">
                              <span className={m.vacationRemaining < 5 ? 'text-red-500' : 'text-gray-900'}>
                                {m.vacationRemaining} / {m.totalVacation} gg
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-3 gap-8">
              <div className="col-span-2 bg-white p-8 md:p-10 rounded-[3rem] border border-gray-50 shadow-sm">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-8">Ritual Selezionati</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {services.slice(0, 6).map(s => (
                    <button key={s.id} onClick={() => { setSelectedAppointment({ service_id: s.id }); setIsFormOpen(true); }} className="p-6 bg-gray-50 rounded-[2rem] hover:bg-amber-50 transition-all text-left group">
                      <p className="text-[8px] font-bold text-amber-600 uppercase mb-1">{s.category}</p>
                      <h4 className="font-bold text-sm mb-1">{s.name}</h4>
                      <p className="text-xs font-luxury font-bold text-gray-900">CHF {s.price}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-black text-white p-10 rounded-[3.5rem] shadow-2xl flex flex-col justify-between h-full min-h-[300px]">
                <div>
                  <h3 className="text-xl font-luxury font-bold mb-4">L'Atelier</h3>
                  <p className="text-[11px] leading-relaxed text-gray-400 italic">"Un rifugio di lusso dedicato alla cura del sé. Ogni servizio è un rituale sartoriale unico."</p>
                </div>
                <button onClick={() => user ? setIsFormOpen(true) : setIsAuthOpen(true)} className="w-full py-4 bg-white text-black rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-amber-600 hover:text-white transition-all shadow-xl">Riserva un Momento</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'clients' && isAdmin && (
          <div className="space-y-8 animate-in fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h2 className="text-4xl font-luxury font-bold">Gestione Ospiti</h2>
              <div className="flex gap-4 w-full md:w-auto">
                <input type="text" placeholder="Ricerca per nome..." className="flex-1 px-6 py-3 bg-white border border-gray-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-amber-500" value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-4">
              {profiles.filter(p => (p.full_name || '').toLowerCase().includes(clientSearch.toLowerCase())).map(p => (
                <div key={p.id} className="bg-white p-6 rounded-[2.5rem] border border-gray-50 flex items-center justify-between hover:shadow-md transition-all">
                  <div className="flex items-center gap-4">
                    <img src={p.avatar || `https://ui-avatars.com/api/?name=${p.full_name || 'U'}`} className="w-12 h-12 rounded-full shadow-sm" />
                    <div>
                      <h5 className="font-bold text-lg">{p.full_name || 'Ospite Kristal'}</h5>
                      <p className="text-[10px] text-gray-400 uppercase font-bold">{p.email || 'Email non disponibile'} | {p.phone || 'Nessun contatto'}</p>
                    </div>
                  </div>
                  <button onClick={() => setViewingGuest(p)} className="px-6 py-3 bg-gray-50 rounded-xl text-[9px] font-bold uppercase hover:bg-black hover:text-white transition-all">Scheda CRM</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {(activeTab === 'team_schedule' || activeTab === 'collab_dashboard') && (isAdmin || isCollaborator) && (
          <div className="space-y-12 animate-in fade-in">
            <h2 className="text-4xl font-luxury font-bold">Il Team & Planning</h2>
            <TeamPlanning team={team} appointments={appointments} onToggleVacation={handleToggleVacation} />
            {isAdmin && (
              <div className="grid md:grid-cols-3 gap-6">
                {team.map(m => (
                  <div key={m.name} className="bg-white p-8 rounded-[3rem] border border-gray-50 text-center shadow-sm">
                    <img src={m.avatar || `https://ui-avatars.com/api/?name=${m.name}`} className="w-24 h-24 rounded-full mx-auto mb-4 object-cover shadow-lg" />
                    <h4 className="text-xl font-luxury font-bold">{m.name}</h4>
                    <p className="text-[9px] text-amber-600 font-bold uppercase mb-6">{m.role}</p>
                    <button onClick={() => setEditingMember(m)} className="w-full py-3 bg-gray-50 rounded-xl text-[9px] font-bold uppercase hover:bg-black hover:text-white transition-all">Gestisci Profilo</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'services_management' && isAdmin && (
          <div className="space-y-8 animate-in fade-in">
            <div className="flex justify-between items-center">
              <h2 className="text-4xl font-luxury font-bold">Gestione Ritual</h2>
              <button onClick={() => setIsServiceFormOpen(true)} className="px-8 py-4 bg-black text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest">Crea Nuovo Ritual</button>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {services.map(s => (
                <div key={s.id} className="bg-white p-8 rounded-[2.5rem] border border-gray-50 flex justify-between items-center shadow-sm">
                  <div>
                    <p className="text-[9px] font-bold text-amber-600 uppercase mb-1">{s.category}</p>
                    <h4 className="font-bold text-lg">{s.name}</h4>
                    <p className="text-xs text-gray-400">CHF {s.price} | {s.duration} min</p>
                  </div>
                  <button onClick={async () => { if(confirm('Eliminare questo servizio?')) { await db.services.delete(s.id); refreshData(); } }} className="text-gray-300 hover:text-red-500"><i className="fas fa-trash"></i></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'calendar' && user && (
          <div className="space-y-12 animate-in fade-in">
             <h2 className="text-4xl font-luxury font-bold">Agenda Personale</h2>
             <div className="space-y-4">
                {appointments.filter(a => a.client_id === user.id).length > 0 ? (
                  appointments.filter(a => a.client_id === user.id).map(app => (
                    <div key={app.id} className="bg-white p-8 rounded-[2.5rem] border border-gray-50 flex justify-between items-center shadow-sm">
                       <div>
                          <p className="text-[10px] font-bold text-amber-600 uppercase">{app.services?.name || 'Servizio'}</p>
                          <p className="text-xl font-luxury font-bold">{new Date(app.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Specialista: {app.team_member_name}</p>
                       </div>
                       <span className="px-4 py-2 bg-gray-50 rounded-full text-[8px] font-bold uppercase text-gray-400">Status: Confermato</span>
                    </div>
                  ))
                ) : (
                  <div className="bg-white p-12 rounded-[3rem] text-center border border-dashed">
                    <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Nessun rituale in programma.</p>
                  </div>
                )}
             </div>
          </div>
        )}

      </Layout>

      {/* MODAL SYSTEM */}
      {isAuthOpen && !user && (
        <div className="fixed inset-0 z-[1000] bg-white overflow-y-auto animate-in slide-in-from-bottom duration-500">
          <button onClick={() => setIsAuthOpen(false)} className="absolute top-10 right-10 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center z-10 hover:rotate-90 transition-all duration-500">
            <i className="fas fa-times text-gray-400"></i>
          </button>
          <Auth onLogin={(u) => { setUser(u); setIsAuthOpen(false); }} />
        </div>
      )}

      {isFormOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[800] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] p-10 shadow-2xl overflow-y-auto max-h-[90vh]">
             <AppointmentForm services={services} team={team} existingAppointments={appointments} onSave={async (a) => { await db.appointments.upsert({ ...a, client_id: isAdmin ? a.client_id : user?.id }); setIsFormOpen(false); refreshData(); }} onCancel={() => setIsFormOpen(false)} isAdmin={isAdmin} profiles={profiles} initialData={selectedAppointment} />
          </div>
        </div>
      )}

      {viewingGuest && (
        <div className="fixed inset-0 bg-white/95 backdrop-blur-2xl z-[900] overflow-y-auto p-6 flex items-center justify-center">
           <div className="w-full max-w-5xl bg-white rounded-[4rem] shadow-2xl p-12 border border-gray-100 relative max-h-[90vh] flex flex-col">
              <button onClick={() => setViewingGuest(null)} className="absolute top-10 right-10 text-gray-300 hover:text-black"><i className="fas fa-times text-xl"></i></button>
              <div className="flex items-center gap-10 mb-12 border-b pb-10">
                 <img src={viewingGuest.avatar || `https://ui-avatars.com/api/?name=${viewingGuest.full_name}`} className="w-32 h-32 rounded-full shadow-xl" />
                 <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                       <h3 className="text-4xl font-luxury font-bold">{viewingGuest.full_name}</h3>
                       <select value={viewingGuest.role} onChange={(e) => handleUpdateRole(viewingGuest.id, e.target.value)} className="bg-gray-50 border-none text-[9px] font-bold uppercase px-3 py-1 rounded-lg outline-none cursor-pointer">
                          <option value="client">Ruolo: Ospite</option>
                          <option value="collaborator">Ruolo: Artista</option>
                          <option value="admin">Ruolo: Direzione</option>
                       </select>
                    </div>
                    <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">{viewingGuest.email} | {viewingGuest.phone || 'Contatto non disponibile'}</p>
                 </div>
              </div>
              <div className="flex-1 overflow-y-auto grid md:grid-cols-2 gap-12 pr-4 scrollbar-hide">
                 <div className="space-y-8">
                    <h4 className="text-xl font-luxury font-bold border-l-4 border-amber-600 pl-4">Schede Tecniche</h4>
                    <textarea placeholder="Inserisci formula colore, riflessante o note tecniche..." className="w-full p-6 rounded-3xl bg-gray-50 border-none text-xs outline-none" rows={4} value={newSheet.content} onChange={(e) => setNewSheet({...newSheet, content: e.target.value})} />
                    <button onClick={handleAddTechnicalSheet} className="w-full py-4 bg-black text-white rounded-2xl text-[9px] font-bold uppercase tracking-widest shadow-lg">Salva Annotazione</button>
                    <div className="space-y-4">
                       {(viewingGuest.technical_sheets || []).map((s: any) => (
                         <div key={s.id} className="p-6 bg-white border border-gray-50 rounded-3xl">
                            <p className="text-[9px] text-gray-300 font-bold mb-2">{new Date(s.date).toLocaleDateString()}</p>
                            <p className="text-[11px] text-gray-700 whitespace-pre-wrap">{s.content}</p>
                         </div>
                       ))}
                    </div>
                 </div>
                 <div className="space-y-8">
                    <h4 className="text-xl font-luxury font-bold border-l-4 border-gray-900 pl-4">Storico Trattamenti</h4>
                    <div className="space-y-4">
                       {appointments.filter(a => a.client_id === viewingGuest.id).sort((a,b) => b.date.localeCompare(a.date)).map(app => (
                         <div key={app.id} className="flex items-center justify-between p-6 bg-white border border-gray-50 rounded-3xl">
                            <div>
                               <p className="text-[10px] font-bold">{app.services?.name}</p>
                               <p className="text-[8px] text-gray-400 uppercase tracking-widest mt-1">{new Date(app.date).toLocaleDateString()} • {app.team_member_name}</p>
                            </div>
                            <span className={`text-[7px] font-bold uppercase px-3 py-1 rounded-full ${app.status === 'noshow' ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-gray-400'}`}>
                               {app.status === 'noshow' ? 'No-Show' : 'Eseguito'}
                            </span>
                         </div>
                       ))}
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {isServiceFormOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[800] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-[3rem] p-10 shadow-2xl">
            <ServiceForm onSave={async (s) => { await db.services.upsert(s); setIsServiceFormOpen(false); refreshData(); }} onCancel={() => setIsServiceFormOpen(false)} />
          </div>
        </div>
      )}

      {editingMember && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[800] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-[3rem] p-10 shadow-2xl overflow-y-auto max-h-[90vh]">
            <TeamManagement member={editingMember} appointments={appointments} services={services} onSave={async (m) => { await db.team.upsert(m); refreshData(); setEditingMember(null); }} onClose={() => setEditingMember(null)} />
          </div>
        </div>
      )}

      <AIAssistant user={user} />
    </>
  );
};

export default App;
