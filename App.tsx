
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Layout from './components/Layout';
import Auth from './components/Auth';
import AppointmentForm from './components/AppointmentForm';
import ServiceForm from './components/ServiceForm';
import TeamManagement from './components/TeamManagement';
import TeamPlanning from './components/TeamPlanning';
import RequestManagement from './components/RequestManagement';
import CollaboratorDashboard from './components/CollaboratorDashboard';
import VisionAnalytics from './components/VisionAnalytics';
import AIAssistant from './components/AIAssistant';
import InstagramGallery from './components/InstagramGallery';
import { supabase, db } from './services/supabase';
import { Service, User, TeamMember, Appointment, LeaveRequest, SalonClosure } from './types';
import { SERVICES as DEFAULT_SERVICES, TEAM as DEFAULT_TEAM } from './constants';

const SALON_PHONE = '+41 91 859 37 77';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Feature Settings con persistenza (v10) - Rimosso salonPhone
  const [settings, setSettings] = useState({
    aiAssistantEnabled: false,
    instagramIntegrationEnabled: false,
    instagramToken: '',
    emailNotificationsEnabled: true
  });

  const [appointments, setAppointments] = useState<any[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [salonClosures, setSalonClosures] = useState<SalonClosure[]>([]);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isServiceFormOpen, setIsServiceFormOpen] = useState(false);
  const [formInitialData, setFormInitialData] = useState<any>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [selectedAppointmentDetail, setSelectedAppointmentDetail] = useState<any | null>(null);
  const [selectedServiceToEdit, setSelectedServiceToEdit] = useState<Service | undefined>(undefined);
  
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  useEffect(() => {
    const savedSettings = localStorage.getItem('kristal_settings_v10');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  const saveSettings = (newSettings: typeof settings) => {
    setSettings(newSettings);
    localStorage.setItem('kristal_settings_v10', JSON.stringify(newSettings));
    showToast("Configurazione salvata.");
  };

  const ensureDataSeeding = useCallback(async () => {
    try {
      const existingServices = await db.services.getAll();
      if (!existingServices || existingServices.length === 0) {
        console.log("Seeding default services...");
        for (const s of DEFAULT_SERVICES) {
          await db.services.upsert(s);
        }
      }
      const existingTeam = await db.team.getAll();
      if (!existingTeam || existingTeam.length === 0) {
        console.log("Seeding default team...");
        for (const m of DEFAULT_TEAM) {
          await db.team.upsert(m);
        }
      }
    } catch (e) {
      console.warn("Seeding error:", e);
    }
  }, []);

  const refreshData = useCallback(async () => {
    try {
      // Assicuriamoci che i dati esistano prima di caricarli
      await ensureDataSeeding();
      
      const [svcs, tm, appts, reqs, profs, closures] = await Promise.all([
        db.services.getAll(),
        db.team.getAll(),
        db.appointments.getAll(),
        db.requests.getAll(),
        db.profiles.getAll(),
        db.salonClosures.getAll()
      ]);
      
      setServices(svcs || []);
      setTeam(tm || []);
      setAppointments(appts || []);
      setRequests(reqs || []);
      setProfiles(profs || []);
      setSalonClosures(closures || []);
    } catch (e) {
      console.error("Data Refresh Error", e);
    } finally {
      setLoading(false);
    }
  }, [ensureDataSeeding]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setActiveTab('dashboard');
      } else if (session?.user) {
        const profile = await db.profiles.get(session.user.id).catch(() => null);
        const email = session.user.email?.toLowerCase();
        let role: any = profile?.role || 'client';
        if (email === 'serop.serop@outlook.com') role = 'admin';
        else if (email === 'sirop.sirop@outlook.sa') role = 'collaborator';
        
        setUser({ 
          id: session.user.id, 
          email: session.user.email!, 
          fullName: profile?.full_name || 'Ospite Kristal', 
          phone: profile?.phone || '', 
          role, 
          avatar: profile?.avatar 
        });
      }
      // Dopo il check auth, carichiamo i dati
      refreshData();
    });
    return () => subscription.unsubscribe();
  }, [refreshData]);

  // Ricaricamento periodico o su cambio tab per consistenza
  useEffect(() => {
    if (activeTab !== 'dashboard') {
      refreshData();
    }
  }, [activeTab, refreshData]);

  const logOperation = async (clientId: string, action: string, details: string) => {
    const timestamp = new Date().toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const logEntry = `[${timestamp}] ${action}: ${details}`;
    
    const profile = profiles.find(p => p.id === clientId);
    if (!profile) return;

    const updatedHistory = [...(profile.treatment_history || []), { service: logEntry, date: new Date().toISOString() }];
    const updatedSheets = [...(profile.technical_sheets || []), {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString(),
      category: 'LOG_SISTEMA',
      content: logEntry,
      author: user?.fullName || 'Sistema Kristal'
    }];

    await db.profiles.upsert({
      ...profile,
      treatment_history: updatedHistory,
      technical_sheets: updatedSheets
    });
  };

  const isAdmin = user?.role === 'admin';
  const isCollaborator = user?.role === 'collaborator';
  const isGuest = !user;

  const currentMember = useMemo(() => {
    if (!user || user.role !== 'collaborator') return null;
    return team.find(m => m.profile_id === user.id || m.name === user.fullName.split(' ')[0]);
  }, [team, user]);

  const categories = useMemo(() => {
    if (!services || services.length === 0) return [];
    const cats = services.map(s => s.category);
    return Array.from(new Set(cats));
  }, [services]);

  const groupedGuestAppointments = useMemo(() => {
    if (!user) return { upcoming: [], history: [], cancelled: [] };
    const userAppts = appointments.filter(a => a.client_id === user.id);
    const now = new Date();

    return {
      upcoming: userAppts.filter(a => new Date(a.date) >= now && a.status === 'confirmed').sort((a,b) => a.date.localeCompare(b.date)),
      history: userAppts.filter(a => new Date(a.date) < now && (a.status === 'confirmed' || a.status === 'noshow')).sort((a,b) => b.date.localeCompare(a.date)),
      cancelled: userAppts.filter(a => a.status === 'cancelled').sort((a,b) => b.date.localeCompare(a.date))
    };
  }, [appointments, user]);

  const handleUpdateAppointmentStatus = async (id: string, status: 'confirmed' | 'cancelled' | 'noshow') => {
    try {
      const appt = appointments.find(a => a.id === id);
      if (appt) {
        await db.appointments.upsert({ ...appt, status });
        const actionText = status === 'confirmed' ? 'CONFERMATO' : status === 'cancelled' ? 'CANCELLATO' : 'NON EFFETTUATO (NO-SHOW)';
        await logOperation(appt.client_id, 'STATO RITUAL', `${actionText} - ${appt.services?.name} il ${new Date(appt.date).toLocaleDateString()}`);
        showToast(`Stato rituale aggiornato.`);
        refreshData();
        setSelectedAppointmentDetail(null);
      }
    } catch (e) {
      showToast("Errore operazione.", "error");
    }
  };

  const handleOpenSlotForm = (memberName: string, date: string, hour: string) => {
    setFormInitialData({ team_member_name: memberName, date: new Date(`${date}T${hour}:00`).toISOString() });
    setIsFormOpen(true);
  };

  if (loading) return <div className="min-h-screen bg-[#fcfcfc] flex items-center justify-center"><div className="w-12 h-12 border-4 border-amber-600 border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <>
      {toast && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[3000] animate-in slide-in-from-top-4 duration-500 w-full max-w-md px-4">
          <div className="px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-4 border backdrop-blur-md bg-black/90 text-white border-amber-500/30">
            <i className="fas fa-check-circle text-amber-500"></i>
            <p className="text-[11px] font-bold uppercase tracking-widest">{toast.message}</p>
          </div>
        </div>
      )}

      <Layout user={user} onLogout={() => supabase.auth.signOut()} onLoginClick={() => setIsAuthOpen(true)} activeTab={activeTab} setActiveTab={setActiveTab}>
        
        {activeTab === 'dashboard' && (
          <div className="space-y-16 animate-in fade-in duration-1000">
            {isAdmin ? (
               <VisionAnalytics team={team} appointments={appointments} services={services} />
            ) : isCollaborator && currentMember ? (
                <CollaboratorDashboard 
                  member={currentMember} appointments={appointments} requests={requests} user={user!} 
                  onSendRequest={async (r) => { await db.requests.create({...r, member_name: currentMember.name}); refreshData(); }}
                  onUpdateProfile={async (p) => { await db.profiles.upsert({ ...profiles.find(pr => pr.id === user?.id), ...p }); refreshData(); }}
                  onAddManualAppointment={() => { setFormInitialData(null); setIsFormOpen(true); }}
                />
            ) : (
                <div className="space-y-20">
                  <header className="text-center space-y-4">
                    <h2 className="text-7xl font-luxury font-bold text-gray-900 tracking-tighter">Kristal</h2>
                    <p className="text-amber-600 text-[10px] font-bold uppercase tracking-[0.5em]">Atelier di Bellezza Luxury</p>
                  </header>

                  <div className="grid md:grid-cols-2 gap-12">
                    {categories.length > 0 ? categories.map(cat => (
                      <div key={cat} className="space-y-8">
                        <h4 className="text-[11px] font-bold uppercase tracking-[0.3em] text-gray-300 border-b border-gray-100 pb-4">{cat}</h4>
                        <div className="space-y-4">
                          {services.filter(s => s.category === cat).map(s => (
                            <div key={s.id} onClick={() => { if (isGuest) setIsAuthOpen(true); else { setFormInitialData({ service_id: s.id }); setIsFormOpen(true); } }} className="group p-8 bg-white rounded-[3rem] border border-gray-50 hover:shadow-2xl transition-all flex justify-between items-center cursor-pointer">
                              <div className="flex-1">
                                <h5 className="font-bold text-xl text-gray-900 group-hover:text-amber-600 transition-colors">{s.name}</h5>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">{s.duration} minuti</p>
                              </div>
                              <div className="text-right">
                                <p className="text-2xl font-luxury font-bold text-gray-900">CHF {s.price}</p>
                                <p className="text-[8px] font-bold text-amber-600 uppercase tracking-widest mt-1">Prenota</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )) : (
                      <div className="col-span-full py-20 text-center">
                         <div className="inline-block w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                         <p className="text-gray-400 text-[10px] font-bold uppercase tracking-[0.4em]">Sincronizzazione Menu Ritual...</p>
                      </div>
                    )}
                  </div>
                  {settings.instagramIntegrationEnabled && settings.instagramToken && <InstagramGallery token={settings.instagramToken} />}
                </div>
            )}
          </div>
        )}

        {activeTab === 'my_rituals' && user && (
          <div className="space-y-16 animate-in fade-in">
             <header className="flex items-center justify-between">
               <div>
                  <h2 className="text-5xl font-luxury font-bold text-gray-900">I Miei Ritual</h2>
                  <p className="text-amber-600 text-[9px] font-bold uppercase tracking-[0.4em] mt-2">La vostra storia in Atelier</p>
               </div>
               <div className="w-16 h-16 bg-black text-white rounded-[2rem] flex items-center justify-center shadow-2xl"><i className="fas fa-gem text-xl"></i></div>
             </header>

             <section className="space-y-8">
               <h3 className="text-[11px] font-bold uppercase tracking-[0.3em] text-amber-600 border-l-4 border-amber-600 pl-4">Prossime Sessioni</h3>
               <div className="grid md:grid-cols-2 gap-8">
                 {groupedGuestAppointments.upcoming.length > 0 ? groupedGuestAppointments.upcoming.map(a => (
                   <div key={a.id} className="bg-white p-12 rounded-[4.5rem] border border-gray-100 flex flex-col justify-between shadow-sm hover:shadow-2xl transition-all group">
                      <div className="flex justify-between items-start mb-10">
                         <div className="w-20 h-20 bg-black text-white rounded-[2.5rem] flex flex-col items-center justify-center group-hover:bg-amber-600 transition-colors shadow-lg">
                            <span className="text-[10px] uppercase font-bold text-amber-500 group-hover:text-white">{new Date(a.date).toLocaleDateString('it-IT', { month: 'short' })}</span>
                            <span className="text-3xl font-luxury font-bold">{new Date(a.date).getDate()}</span>
                         </div>
                         <div className="text-right">
                            <span className="px-4 py-2 bg-green-50 text-green-700 text-[9px] font-bold uppercase rounded-full border border-green-100">Confermato</span>
                            <p className="text-xl font-luxury font-bold mt-4">CHF {a.services?.price}</p>
                         </div>
                      </div>
                      <div className="space-y-6">
                        <h4 className="text-3xl font-luxury font-bold text-gray-900">{a.services?.name}</h4>
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-[11px] font-bold text-amber-600">{a.team_member_name[0]}</div>
                           <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">{a.team_member_name} • {new Date(a.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                        </div>
                        <div className="pt-8 border-t border-gray-50 flex items-center justify-between">
                           <div className="space-y-1">
                              <p className="text-[10px] text-gray-400 font-medium leading-relaxed">Per modifiche:</p>
                              <a href={`tel:${SALON_PHONE.replace(/[^\d+]/g, '')}`} className="text-gray-900 font-bold text-xs hover:text-amber-600 transition-colors">{SALON_PHONE}</a>
                           </div>
                           <a 
                             href={`tel:${SALON_PHONE.replace(/[^\d+]/g, '')}`} 
                             className="w-14 h-14 bg-black text-white rounded-[1.8rem] flex items-center justify-center hover:bg-amber-600 transition-all shadow-xl shadow-black/10 active:scale-95"
                           >
                              <i className="fas fa-phone-alt text-lg"></i>
                           </a>
                        </div>
                      </div>
                   </div>
                 )) : (
                   <div className="col-span-full py-24 text-center bg-gray-50/50 rounded-[4rem] border border-dashed border-gray-200">
                     <p className="text-gray-300 text-[10px] font-bold uppercase tracking-[0.4em]">Nessuna sessione programmata</p>
                   </div>
                 )}
               </div>
             </section>

             <section className="space-y-8">
                <h3 className="text-[11px] font-bold uppercase tracking-[0.3em] text-gray-400 border-l-4 border-gray-100 pl-4">I Vostri Momenti</h3>
                <div className="bg-white rounded-[4rem] border border-gray-50 overflow-hidden shadow-sm">
                   {groupedGuestAppointments.history.length > 0 ? groupedGuestAppointments.history.map((a, i) => (
                     <div key={a.id} className={`p-10 flex items-center justify-between transition-colors border-b border-gray-50 last:border-none ${i % 2 === 0 ? 'bg-transparent' : 'bg-gray-50/20'} ${a.status === 'noshow' ? 'opacity-50 grayscale' : ''}`}>
                        <div className="flex items-center gap-10">
                           <div className="text-center w-16">
                              <p className="text-3xl font-luxury font-bold text-gray-900">{new Date(a.date).getDate()}</p>
                              <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">{new Date(a.date).toLocaleDateString('it-IT', { month: 'short' })}</p>
                           </div>
                           <div className="space-y-1">
                              <p className="font-bold text-lg text-gray-900">{a.services?.name}</p>
                              <p className="text-[9px] text-gray-400 uppercase tracking-[0.2em]">{a.team_member_name} • {new Date(a.date).getFullYear()}</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-8">
                           {a.status === 'noshow' && <span className="text-[8px] font-bold text-red-600 bg-red-50 px-4 py-1.5 rounded-full border border-red-100 uppercase tracking-widest">Non Effettuato</span>}
                           <p className="font-luxury font-bold text-xl text-gray-900">CHF {a.services?.price}</p>
                        </div>
                     </div>
                   )) : (
                     <div className="p-20 text-center text-gray-300 italic text-[10px] uppercase tracking-widest">Nessun rituale nell'archivio personale</div>
                   )}
                </div>
             </section>
          </div>
        )}

        {activeTab === 'team_schedule' && (isAdmin || isCollaborator) && (
          <div className="space-y-12 animate-in fade-in">
            <h2 className="text-4xl font-luxury font-bold">Agenda Atelier</h2>
            <TeamPlanning 
              team={team} appointments={appointments} onToggleVacation={() => {}} 
              onSlotClick={handleOpenSlotForm} onAppointmentClick={(a) => setSelectedAppointmentDetail(a)}
              currentUserMemberName={currentMember?.name} isCollaborator={isCollaborator}
              salonClosures={salonClosures.map(c => c.date)}
            />
          </div>
        )}

        {activeTab === 'impostazioni' && isAdmin && (
          <div className="space-y-16 animate-in fade-in">
             <header>
               <h2 className="text-5xl font-luxury font-bold text-gray-900">Configurazione</h2>
               <p className="text-amber-600 text-[10px] font-bold uppercase tracking-[0.5em] mt-2">Centro Controllo Kristal</p>
             </header>
             <div className="grid md:grid-cols-2 gap-12">
                <div className="bg-white p-14 rounded-[5rem] border border-gray-100 shadow-sm space-y-14">
                  <h4 className="text-[11px] font-bold uppercase tracking-[0.3em] text-gray-900 border-b pb-8 flex items-center gap-4"><i className="fas fa-sliders-h text-amber-600"></i> Moduli & Contatto</h4>
                  <div className="space-y-12">
                    <div className="flex items-center justify-between px-6">
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-amber-600 text-white rounded-[1.8rem] flex items-center justify-center shadow-xl"><i className="fas fa-sparkles text-2xl"></i></div>
                        <div><p className="text-lg font-bold">Kristal AI Assistant</p><p className="text-[10px] text-gray-400 font-bold uppercase">Consulente virtuale</p></div>
                      </div>
                      <button onClick={() => setSettings({...settings, aiAssistantEnabled: !settings.aiAssistantEnabled})} className={`w-16 h-9 rounded-full transition-all relative ${settings.aiAssistantEnabled ? 'bg-amber-600' : 'bg-gray-200'}`}><div className={`absolute top-1.5 w-6 h-6 bg-white rounded-full transition-all ${settings.aiAssistantEnabled ? 'left-9' : 'left-1.5'}`}></div></button>
                    </div>
                    <button onClick={() => saveSettings(settings)} className="w-full py-6 bg-black text-white rounded-[2.5rem] font-bold uppercase text-[11px] tracking-[0.4em] shadow-2xl hover:bg-amber-700 transition-all active:scale-95">Salva Configurazione</button>
                  </div>
                </div>
                <div className="bg-white p-14 rounded-[5rem] border border-gray-100 shadow-sm space-y-12">
                   <h4 className="text-[11px] font-bold uppercase tracking-[0.3em] text-gray-900 border-b pb-8 flex items-center gap-4"><i className="fab fa-instagram text-amber-600 text-2xl"></i> Social Integration</h4>
                   <div className="space-y-8">
                      <div className="p-10 bg-gray-50 rounded-[3rem] border border-gray-100">
                        <p className="text-[10px] font-bold uppercase text-amber-600 mb-4 tracking-widest">Guida Token</p>
                        <ol className="text-[11px] leading-relaxed text-gray-600 space-y-3 list-decimal ml-4">
                          <li>Accedi a developers.facebook.com</li>
                          <li>Crea app "Consumer"</li>
                          <li>Instagram Basic Display - Genera Token</li>
                        </ol>
                      </div>
                      <div className="space-y-3">
                        <label className="text-[9px] font-bold uppercase text-gray-400 ml-4">Access Token</label>
                        <input type="password" placeholder="IGQV..." value={settings.instagramToken} onChange={(e) => setSettings({...settings, instagramToken: e.target.value})} className="w-full p-6 rounded-[2rem] bg-gray-50 border-none font-bold text-xs shadow-inner focus:ring-2 focus:ring-amber-500 outline-none" />
                      </div>
                      <div className="flex items-center justify-between px-6"><span className="text-[10px] font-bold uppercase tracking-[0.3em]">Attiva Portfolio Gallery</span><button onClick={() => setSettings({...settings, instagramIntegrationEnabled: !settings.instagramIntegrationEnabled})} className={`w-16 h-9 rounded-full transition-all relative ${settings.instagramIntegrationEnabled ? 'bg-amber-600' : 'bg-gray-200'}`}><div className={`absolute top-1.5 w-6 h-6 bg-white rounded-full transition-all ${settings.instagramIntegrationEnabled ? 'left-9' : 'left-1.5'}`}></div></button></div>
                      <button onClick={() => saveSettings(settings)} className="w-full py-6 bg-black text-white rounded-[2.5rem] font-bold uppercase text-[11px] tracking-[0.4em] shadow-2xl hover:bg-amber-700 transition-all active:scale-95">Sincronizza Social</button>
                   </div>
                </div>
             </div>
          </div>
        )}
      </Layout>

      {settings.aiAssistantEnabled && <AIAssistant />}

      {isFormOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[1800] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-3xl rounded-[5rem] p-16 shadow-2xl relative overflow-y-auto max-h-[92vh]">
             <button onClick={() => { setIsFormOpen(false); setFormInitialData(null); }} className="absolute top-10 right-12 text-gray-300 hover:text-black"><i className="fas fa-times text-3xl"></i></button>
             <AppointmentForm 
               services={services} team={team} existingAppointments={appointments} 
               onSave={async (a) => { 
                 const client_id = (isAdmin || isCollaborator) ? (a.client_id || formInitialData?.client_id || user?.id) : user?.id;
                 const isUpdate = !!a.id;
                 await db.appointments.upsert({ ...a, client_id }); 
                 const ritName = services.find(s => s.id === a.service_id)?.name || 'Ritual';
                 await logOperation(client_id, isUpdate ? 'MODIFICA RITUAL' : 'PRENOTAZIONE', `${ritName} il ${new Date(a.date!).toLocaleDateString()} alle ${new Date(a.date!).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}`);
                 setIsFormOpen(false); setFormInitialData(null); await refreshData(); 
                 showToast(isUpdate ? "Rituale aggiornato." : "Rituale programmato con successo.");
               }} 
               onCancel={() => { setIsFormOpen(false); setFormInitialData(null); }} 
               isAdminOrStaff={isAdmin || isCollaborator} profiles={profiles} initialData={formInitialData}
             />
          </div>
        </div>
      )}

      {selectedAppointmentDetail && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[2000] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-xl rounded-[5rem] p-16 shadow-2xl relative animate-in zoom-in-95">
             <button onClick={() => setSelectedAppointmentDetail(null)} className="absolute top-10 right-12 text-gray-300 hover:text-black"><i className="fas fa-times text-3xl"></i></button>
             <header className="mb-12 text-center">
               <p className="text-amber-600 font-bold text-[10px] uppercase tracking-[0.4em] mb-3">Dettaglio Ritual</p>
               <h3 className="text-4xl font-luxury font-bold text-gray-900">{(selectedAppointmentDetail as any).services?.name}</h3>
               <p className="text-base font-bold mt-4 text-gray-500">{(selectedAppointmentDetail as any).profiles?.full_name}</p>
             </header>
             <div className="grid grid-cols-2 gap-6">
               <button onClick={() => { setFormInitialData(selectedAppointmentDetail); setSelectedAppointmentDetail(null); setIsFormOpen(true); }} className="py-5 bg-gray-50 text-black border border-gray-100 rounded-3xl text-[10px] font-bold uppercase tracking-widest hover:bg-white hover:shadow-lg transition-all">Modifica Orario</button>
               <button onClick={() => handleUpdateAppointmentStatus(selectedAppointmentDetail.id, 'cancelled')} className="py-5 bg-red-50 text-red-600 border border-red-100 rounded-3xl text-[10px] font-bold uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all">Annulla</button>
               <button onClick={() => handleUpdateAppointmentStatus(selectedAppointmentDetail.id, 'noshow')} className="col-span-2 py-5 bg-slate-900 text-white rounded-3xl text-[11px] font-bold uppercase tracking-widest shadow-xl">Segna come No-Show</button>
               <button onClick={() => handleUpdateAppointmentStatus(selectedAppointmentDetail.id, 'confirmed')} className="col-span-2 py-6 bg-black text-white rounded-3xl text-[11px] font-bold uppercase tracking-widest shadow-2xl shadow-black/20 hover:bg-amber-700 transition-all">Conferma Appuntamento</button>
             </div>
          </div>
        </div>
      )}

      {isAuthOpen && (
        <div className="fixed inset-0 bg-black/98 backdrop-blur-3xl z-[2000] flex items-center justify-center p-6">
          <div className="w-full max-w-xl relative animate-in zoom-in-95">
            <button onClick={() => setIsAuthOpen(false)} className="absolute -top-16 right-0 text-white/40 hover:text-white transition-all"><i className="fas fa-times text-4xl"></i></button>
            <Auth onLogin={(u) => { setUser(u); setIsAuthOpen(false); refreshData(); }} />
          </div>
        </div>
      )}
    </>
  );
};

export default App;
