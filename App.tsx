
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

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Feature Settings
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
  const [selectedMemberToManage, setSelectedMemberToManage] = useState<TeamMember | null>(null);
  const [selectedAppointmentDetail, setSelectedAppointmentDetail] = useState<any | null>(null);
  const [selectedServiceToEdit, setSelectedServiceToEdit] = useState<Service | undefined>(undefined);
  
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  useEffect(() => {
    const savedSettings = localStorage.getItem('kristal_settings_v2');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  const saveSettings = (newSettings: typeof settings) => {
    setSettings(newSettings);
    localStorage.setItem('kristal_settings_v2', JSON.stringify(newSettings));
    showToast("Impostazioni salvate con successo.");
  };

  const sendEmailNotification = (appointment: any, type: 'new' | 'update') => {
    if (!settings.emailNotificationsEnabled) return;

    const profile = profiles.find(p => p.id === appointment.client_id) || appointment.profiles;
    const guestName = profile?.full_name || 'Ospite';
    const guestEmail = profile?.email || 'notifica@kristal-atelier.ch';
    const date = new Date(appointment.date).toLocaleString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
    
    // Logica di simulazione avanzata
    console.group(`%c [KRISTAL MAIL SERVER] - ${type.toUpperCase()}`, 'background: #111; color: #d97706; padding: 4px; border-radius: 4px;');
    console.log(`Destinatario: ${guestName} (${guestEmail})`);
    console.log(`Oggetto: ${type === 'new' ? 'Conferma del tuo Ritual Kristal' : 'Aggiornamento del tuo appuntamento'}`);
    console.log(`Corpo: Gentile ${guestName}, ti informiamo che il tuo rituale del ${date} è stato correttamente ${type === 'new' ? 'riservato' : 'aggiornato'}.`);
    console.groupEnd();

    showToast(`Notifica inviata a ${guestName}`, 'info');
  };

  const isAdmin = user?.role === 'admin';
  const isCollaborator = user?.role === 'collaborator';
  const isGuest = !user;

  const currentMember = useMemo(() => {
    if (!user || user.role !== 'collaborator') return null;
    return team.find(m => m.profile_id === user.id || m.name === user.fullName.split(' ')[0]);
  }, [team, user]);

  const categories = useMemo(() => {
    const cats = services.map(s => s.category);
    return Array.from(new Set(cats));
  }, [services]);

  const guestAppointments = useMemo(() => {
    if (!user) return [];
    return appointments.filter(a => a.client_id === user.id).sort((a,b) => b.date.localeCompare(a.date));
  }, [appointments, user]);

  const ensureDataSeeding = useCallback(async () => {
    try {
      const existingServices = await db.services.getAll();
      if (!existingServices || existingServices.length === 0) {
        for (const s of DEFAULT_SERVICES) await db.services.upsert(s);
      }
      const existingTeam = await db.team.getAll();
      if (!existingTeam || existingTeam.length === 0) {
        for (const m of DEFAULT_TEAM) await db.team.upsert(m);
      }
    } catch (e) {
      console.warn("Seeding error:", e);
    }
  }, []);

  const refreshData = useCallback(async () => {
    try {
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

      if (user) {
        const myProfile = profs.find((p: any) => p.id === user.id);
        if (myProfile) {
          setUser(prev => prev ? { ...prev, fullName: myProfile.full_name, avatar: myProfile.avatar, phone: myProfile.phone } : null);
        }
      }
    } catch (e) {
      console.error("Data Refresh Error", e);
    } finally {
      setLoading(false);
    }
  }, [user?.id, ensureDataSeeding]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setAppointments([]);
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
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!loading) refreshData();
  }, [loading, refreshData]);

  const handleUpdateAppointmentStatus = async (id: string, status: 'confirmed' | 'cancelled') => {
    try {
      const appt = appointments.find(a => a.id === id);
      if (appt) {
        await db.appointments.upsert({ ...appt, status });
        showToast(`Rituale ${status === 'confirmed' ? 'confermato' : 'annullato'}.`);
        if (isAdmin || isCollaborator) sendEmailNotification(appt, 'update');
        refreshData();
        setSelectedAppointmentDetail(null);
      }
    } catch (e) {
      showToast("Errore aggiornamento.", "error");
    }
  };

  const handleOpenSlotForm = (memberName: string, date: string, hour: string) => {
    setFormInitialData({ team_member_name: memberName, date: new Date(`${date}T${hour}:00`).toISOString() });
    setIsFormOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fcfcfc] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <h1 className="text-2xl font-luxury font-bold text-gray-900 tracking-tighter">Kristal Atelier</h1>
          <p className="text-[10px] text-amber-600 font-bold uppercase tracking-[0.4em]">Sincronizzazione...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {toast && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[3000] animate-in slide-in-from-top-4 duration-500 w-full max-w-md px-4">
          <div className={`px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-4 border backdrop-blur-md ${
            toast.type === 'error' ? 'bg-red-900/90 text-white border-red-800' : 
            toast.type === 'info' ? 'bg-slate-900/90 text-white border-slate-800' : 
            'bg-black/90 text-white border-amber-500/30'
          }`}>
            <i className={`fas ${toast.type === 'error' ? 'fa-exclamation-circle' : toast.type === 'info' ? 'fa-paper-plane' : 'fa-check-circle'} text-amber-500`}></i>
            <p className="text-[11px] font-bold uppercase tracking-widest">{toast.message}</p>
          </div>
        </div>
      )}

      <Layout user={user} onLogout={() => supabase.auth.signOut()} onLoginClick={() => setIsAuthOpen(true)} activeTab={activeTab} setActiveTab={setActiveTab}>
        
        {activeTab === 'dashboard' && (
          <div className="space-y-12">
            {isAdmin ? (
               <div className="animate-in fade-in"><VisionAnalytics team={team} appointments={appointments} services={services} /></div>
            ) : isCollaborator && currentMember ? (
                <CollaboratorDashboard 
                  member={currentMember} appointments={appointments} requests={requests} user={user!} 
                  onSendRequest={async (r) => { await db.requests.create({...r, member_name: currentMember.name}); refreshData(); }}
                  onUpdateProfile={async (p) => { await db.profiles.upsert({ ...profiles.find(pr => pr.id === user?.id), ...p }); refreshData(); }}
                  onAddManualAppointment={() => { setFormInitialData(null); setIsFormOpen(true); }}
                />
            ) : (
                <div className="space-y-16 animate-in fade-in duration-1000">
                  <header className="text-center space-y-4">
                    <h2 className="text-6xl font-luxury font-bold text-gray-900 tracking-tighter">Kristal</h2>
                    <p className="text-amber-600 text-[10px] font-bold uppercase tracking-[0.4em]">L'Eccellenza è un Rituale</p>
                  </header>

                  <div className="grid md:grid-cols-2 gap-10">
                    {categories.map(cat => (
                      <div key={cat} className="space-y-6">
                        <h4 className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400 border-b border-gray-100 pb-4">{cat}</h4>
                        <div className="space-y-4">
                          {services.filter(s => s.category === cat).map(s => (
                            <div 
                              key={s.id} 
                              className="group p-6 bg-white rounded-[2.5rem] border border-gray-50 hover:shadow-xl transition-all flex justify-between items-center cursor-pointer active:scale-95" 
                              onClick={() => {
                                if (isGuest) setIsAuthOpen(true);
                                else { setFormInitialData({ service_id: s.id }); setIsFormOpen(true); }
                              }}
                            >
                              <div className="flex-1">
                                <h5 className="font-bold text-lg text-gray-900 group-hover:text-amber-600 transition-colors">{s.name}</h5>
                                <p className="text-[10px] text-gray-400 font-medium">{s.duration} minuti</p>
                              </div>
                              <div className="text-right">
                                <p className="text-xl font-luxury font-bold text-gray-900">CHF {s.price}</p>
                                <p className="text-[8px] font-bold text-amber-600 uppercase tracking-widest mt-1">Prenota</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {settings.instagramIntegrationEnabled && settings.instagramToken && (
                    <InstagramGallery token={settings.instagramToken} />
                  )}
                </div>
            )}
          </div>
        )}

        {activeTab === 'my_rituals' && user && (
          <div className="space-y-10 animate-in fade-in">
             <h2 className="text-4xl font-luxury font-bold">I Miei Ritual</h2>
             <div className="grid gap-6">
               {guestAppointments.length > 0 ? guestAppointments.map(a => (
                 <div key={a.id} className="bg-white p-8 rounded-[3rem] border border-gray-50 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 bg-black text-white rounded-[1.5rem] flex flex-col items-center justify-center">
                        <span className="text-[8px] uppercase font-bold text-amber-500">{new Date(a.date).toLocaleDateString('it-IT', { month: 'short' })}</span>
                        <span className="text-xl font-luxury font-bold">{new Date(a.date).getDate()}</span>
                      </div>
                      <div>
                        <h5 className="font-bold text-lg">{a.services?.name}</h5>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Con {a.team_member_name} alle {new Date(a.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                      </div>
                    </div>
                    <span className={`px-4 py-1.5 rounded-full text-[8px] font-bold uppercase ${a.status === 'confirmed' ? 'bg-green-100 text-green-700' : a.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                      {a.status}
                    </span>
                 </div>
               )) : (
                 <div className="p-20 text-center bg-white rounded-[4rem] border border-dashed border-gray-200">
                    <p className="text-gray-400 text-[10px] font-bold uppercase tracking-[0.2em]">Non avete ancora Ritual programmati</p>
                 </div>
               )}
             </div>
          </div>
        )}

        {activeTab === 'team_schedule' && (isAdmin || isCollaborator) && (
          <div className="space-y-12 animate-in fade-in">
            <h2 className="text-4xl font-luxury font-bold">Agenda Atelier</h2>
            <TeamPlanning 
              team={team} 
              appointments={appointments} 
              onToggleVacation={() => {}} 
              onSlotClick={handleOpenSlotForm}
              onAppointmentClick={(a) => setSelectedAppointmentDetail(a)}
              currentUserMemberName={currentMember?.name} 
              isCollaborator={isCollaborator}
              salonClosures={salonClosures.map(c => c.date)}
            />
          </div>
        )}

        {activeTab === 'vacation_planning' && isAdmin && (
          <div className="space-y-12 animate-in fade-in">
            <header>
               <h2 className="text-4xl font-luxury font-bold">Vacanze & Chiusure</h2>
               <p className="text-[10px] text-amber-600 font-bold uppercase tracking-widest mt-1">Gestione ferie staff e festività atelier</p>
            </header>

            <div className="grid lg:grid-cols-2 gap-10">
               <div className="bg-white p-10 rounded-[3.5rem] border border-gray-100 shadow-sm space-y-8">
                  <h4 className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-900 border-b pb-4 flex items-center gap-3">
                     <i className="fas fa-ribbon text-amber-600"></i> Nuova Festività Atelier
                  </h4>
                  <div className="space-y-6">
                    <input id="h-name" type="text" placeholder="Nome Festività" className="w-full p-4 rounded-2xl bg-gray-50 border-none font-bold text-sm shadow-inner" />
                    <input id="h-date" type="date" className="w-full p-4 rounded-2xl bg-gray-50 border-none font-bold text-sm shadow-inner" />
                    <button onClick={async () => {
                      const n = (document.getElementById('h-name') as HTMLInputElement).value;
                      const d = (document.getElementById('h-date') as HTMLInputElement).value;
                      if(n && d) {
                        const updated = [...salonClosures, { name: n, date: d }];
                        await db.salonClosures.save(updated);
                        setSalonClosures(updated);
                        showToast("Chiusura aggiunta.");
                      }
                    }} className="w-full py-4 bg-black text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest">Aggiungi Chiusura</button>
                    
                    <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                       {salonClosures.map(c => (
                         <div key={c.date} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl">
                            <div>
                               <p className="text-[10px] font-bold">{c.name}</p>
                               <p className="text-[8px] text-amber-600 uppercase font-bold">{new Date(c.date).toLocaleDateString()}</p>
                            </div>
                            <button onClick={async () => {
                               const updated = salonClosures.filter(x => x.date !== c.date);
                               await db.salonClosures.save(updated);
                               setSalonClosures(updated);
                            }} className="text-gray-300 hover:text-red-500"><i className="fas fa-trash"></i></button>
                         </div>
                       ))}
                    </div>
                  </div>
               </div>

               <div className="bg-white p-10 rounded-[3.5rem] border border-gray-100 shadow-sm space-y-8">
                  <h4 className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400 border-b pb-4">Approvazione Richieste Staff</h4>
                  <RequestManagement requests={requests} onAction={async (id, action) => {
                    await db.requests.update(id, { status: action });
                    if (action === 'approved') {
                      const req = requests.find(r => r.id === id);
                      if (req) {
                        const member = team.find(m => m.name === req.member_name);
                        if (member) {
                          const updatedAbsences = [...(member.absences_json || []), {
                            id: req.id, startDate: req.start_date, endDate: req.end_date, type: req.type, isFullDay: req.is_full_day
                          }];
                          await db.team.upsert({ ...member, absences_json: updatedAbsences });
                        }
                      }
                    }
                    refreshData();
                    showToast(`Richiesta ${action}.`);
                  }} />
               </div>
            </div>
          </div>
        )}

        {activeTab === 'impostazioni' && isAdmin && (
          <div className="space-y-12 animate-in fade-in">
             <header>
               <h2 className="text-4xl font-luxury font-bold">Impostazioni</h2>
               <p className="text-[10px] text-amber-600 font-bold uppercase tracking-widest mt-1">Configurazione Funzionalità Atelier</p>
             </header>

             <div className="grid md:grid-cols-2 gap-10">
                <div className="bg-white p-10 rounded-[3.5rem] border border-gray-100 shadow-sm space-y-8">
                  <h4 className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-900 border-b pb-4">Moduli Attivi</h4>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-6 bg-gray-50 rounded-3xl">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-amber-600 text-white rounded-2xl flex items-center justify-center"><i className="fas fa-sparkles"></i></div>
                        <div><p className="text-sm font-bold">AI Assistant</p><p className="text-[8px] text-gray-400 font-bold uppercase">Kristal Virtual Consultant</p></div>
                      </div>
                      <button onClick={() => saveSettings({...settings, aiAssistantEnabled: !settings.aiAssistantEnabled})} className={`w-12 h-6 rounded-full transition-all relative ${settings.aiAssistantEnabled ? 'bg-amber-600' : 'bg-gray-300'}`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.aiAssistantEnabled ? 'left-7' : 'left-1'}`}></div>
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-6 bg-gray-50 rounded-3xl">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-900 text-white rounded-2xl flex items-center justify-center"><i className="fas fa-envelope"></i></div>
                        <div><p className="text-sm font-bold">Notifiche Email</p><p className="text-[8px] text-gray-400 font-bold uppercase">Conferme auto agli ospiti</p></div>
                      </div>
                      <button onClick={() => saveSettings({...settings, emailNotificationsEnabled: !settings.emailNotificationsEnabled})} className={`w-12 h-6 rounded-full transition-all relative ${settings.emailNotificationsEnabled ? 'bg-amber-600' : 'bg-gray-300'}`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.emailNotificationsEnabled ? 'left-7' : 'left-1'}`}></div>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-10 rounded-[3.5rem] border border-gray-100 shadow-sm space-y-8">
                   <h4 className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-900 border-b pb-4">Integrazione Instagram</h4>
                   <div className="space-y-4">
                      <p className="text-[10px] text-gray-400 leading-relaxed italic">Inserisci il "User Access Token" di Instagram Graph API per mostrare i lavori recenti nella dashboard degli ospiti.</p>
                      <input 
                        type="password" 
                        placeholder="Instagram Access Token..." 
                        value={settings.instagramToken} 
                        onChange={(e) => setSettings({...settings, instagramToken: e.target.value})}
                        className="w-full p-4 rounded-2xl bg-gray-50 border-none font-bold text-xs"
                      />
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                         <span className="text-[10px] font-bold uppercase">Mostra Gallery</span>
                         <button onClick={() => saveSettings({...settings, instagramIntegrationEnabled: !settings.instagramIntegrationEnabled})} className={`w-12 h-6 rounded-full transition-all relative ${settings.instagramIntegrationEnabled ? 'bg-amber-600' : 'bg-gray-300'}`}>
                           <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.instagramIntegrationEnabled ? 'left-7' : 'left-1'}`}></div>
                         </button>
                      </div>
                      <button onClick={() => saveSettings(settings)} className="w-full py-4 bg-black text-white rounded-2xl text-[10px] font-bold uppercase">Salva Configurazione</button>
                   </div>
                </div>
             </div>
          </div>
        )}

        {activeTab === 'services_management' && isAdmin && (
          <div className="space-y-12 animate-in fade-in">
             <div className="flex justify-between items-center">
               <h2 className="text-4xl font-luxury font-bold">Menu Ritual</h2>
               <button onClick={() => { setSelectedServiceToEdit(undefined); setIsServiceFormOpen(true); }} className="px-8 py-4 bg-black text-white rounded-2xl font-bold uppercase text-[10px] tracking-widest">Crea Ritual</button>
             </div>
             <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
               {services.map(s => (
                 <div key={s.id} onClick={() => { setSelectedServiceToEdit(s); setIsServiceFormOpen(true); }} className="bg-white p-10 rounded-[3rem] border border-gray-50 shadow-sm hover:shadow-xl transition-all cursor-pointer">
                   <h4 className="font-bold text-xl mb-1">{s.name}</h4>
                   <p className="text-[10px] text-amber-600 font-bold uppercase mb-4 tracking-widest">{s.category}</p>
                   <div className="flex justify-between items-end">
                     <p className="text-2xl font-luxury font-bold">CHF {s.price}</p>
                     <p className="text-[10px] text-gray-400 font-bold">{s.duration} min</p>
                   </div>
                 </div>
               ))}
             </div>
          </div>
        )}
      </Layout>

      {settings.aiAssistantEnabled && <AIAssistant />}

      {/* Modale Appuntamento */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[1800] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-[4rem] p-12 shadow-2xl relative overflow-y-auto max-h-[90vh]">
             <button onClick={() => { setIsFormOpen(false); setFormInitialData(null); }} className="absolute top-8 right-10 text-gray-300 hover:text-black">
               <i className="fas fa-times text-2xl"></i>
             </button>
             <AppointmentForm 
               services={services} team={team} existingAppointments={appointments} 
               onSave={async (a) => { 
                 const client_id = (isAdmin || isCollaborator) ? (a.client_id || formInitialData?.client_id || user?.id) : user?.id;
                 const isUpdate = !!a.id;
                 await db.appointments.upsert({ ...a, client_id }); 
                 setIsFormOpen(false); setFormInitialData(null); await refreshData(); 
                 showToast(isUpdate ? "Ritual aggiornato." : "Ritual programmato.");
                 sendEmailNotification(a, isUpdate ? 'update' : 'new');
                 setActiveTab(isAdmin || isCollaborator ? 'team_schedule' : 'dashboard');
               }} 
               onCancel={() => { setIsFormOpen(false); setFormInitialData(null); }} 
               isAdminOrStaff={isAdmin || isCollaborator} profiles={profiles} initialData={formInitialData}
             />
          </div>
        </div>
      )}

      {selectedAppointmentDetail && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[2000] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-[4rem] p-12 shadow-2xl relative animate-in zoom-in-95">
             <button onClick={() => setSelectedAppointmentDetail(null)} className="absolute top-8 right-10 text-gray-300 hover:text-black">
               <i className="fas fa-times text-2xl"></i>
             </button>
             <header className="mb-10 text-center">
               <p className="text-amber-600 font-bold text-[9px] uppercase tracking-widest mb-2">Dettaglio Ritual</p>
               <h3 className="text-3xl font-luxury font-bold">{(selectedAppointmentDetail as any).services?.name}</h3>
               <p className="text-sm font-bold mt-2 text-gray-500">Ospite: {(selectedAppointmentDetail as any).profiles?.full_name}</p>
             </header>
             <div className="grid grid-cols-2 gap-4">
               <button onClick={() => { setFormInitialData(selectedAppointmentDetail); setSelectedAppointmentDetail(null); setIsFormOpen(true); }} className="py-4 bg-gray-50 text-black border border-gray-100 rounded-2xl text-[9px] font-bold uppercase tracking-widest">Modifica</button>
               <button onClick={() => handleUpdateAppointmentStatus(selectedAppointmentDetail.id, 'cancelled')} className="py-4 bg-red-50 text-red-600 border border-red-100 rounded-2xl text-[9px] font-bold uppercase tracking-widest">Annulla</button>
               <button onClick={() => handleUpdateAppointmentStatus(selectedAppointmentDetail.id, 'confirmed')} className="col-span-2 py-5 bg-black text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-xl">Conferma Ritual</button>
             </div>
          </div>
        </div>
      )}

      {isAuthOpen && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-[2000] flex items-center justify-center p-4">
          <div className="w-full max-w-lg relative animate-in zoom-in-95">
            <button onClick={() => setIsAuthOpen(false)} className="absolute -top-12 right-0 text-white/50 hover:text-white"><i className="fas fa-times text-2xl"></i></button>
            <Auth onLogin={(u) => { setUser(u); setIsAuthOpen(false); refreshData(); }} />
          </div>
        </div>
      )}

      {isServiceFormOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[1800] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[4rem] p-12 shadow-2xl relative">
             <button onClick={() => setIsServiceFormOpen(false)} className="absolute top-8 right-10 text-gray-300 hover:text-black"><i className="fas fa-times text-2xl"></i></button>
             <h3 className="text-3xl font-luxury font-bold mb-10">Ritual Menu</h3>
             <ServiceForm initialData={selectedServiceToEdit} onSave={async (s) => { await db.services.upsert(s); setIsServiceFormOpen(false); refreshData(); showToast("Servizio aggiornato."); }} onCancel={() => setIsServiceFormOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
};

export default App;
