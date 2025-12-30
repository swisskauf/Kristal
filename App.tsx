
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Layout from './components/Layout';
import Auth from './components/Auth';
import AppointmentForm from './components/AppointmentForm';
import ServiceForm from './components/ServiceForm';
import TeamManagement from './components/TeamManagement';
import NewStaffForm from './components/NewStaffForm';
import TeamPlanning from './components/TeamPlanning';
import RequestManagement from './components/RequestManagement';
import CollaboratorDashboard from './components/CollaboratorDashboard';
import VisionAnalytics from './components/VisionAnalytics';
import AIAssistant from './components/AIAssistant';
import InstagramGallery from './components/InstagramGallery';
import GuestManagement from './components/GuestManagement';
import NewGuestForm from './components/NewGuestForm';
import { supabase, db } from './services/supabase';
import { Service, User, TeamMember, Appointment, LeaveRequest, SalonClosure } from './types';
import { SERVICES as DEFAULT_SERVICES, TEAM as DEFAULT_TEAM } from './constants';
import { sendLuxuryEmailNotification } from './services/emailService';

const SALON_PHONE = '+41 91 859 37 77';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  
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
  
  // Modal & Form state
  const [newClosure, setNewClosure] = useState({ date: '', name: '' });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isServiceFormOpen, setIsServiceFormOpen] = useState(false);
  const [isTeamEditorOpen, setIsTeamEditorOpen] = useState(false);
  const [isNewStaffModalOpen, setIsNewStaffModalOpen] = useState(false);
  const [isGuestEditorOpen, setIsGuestEditorOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  
  const [formInitialData, setFormInitialData] = useState<any>(null);
  const [selectedServiceToEdit, setSelectedServiceToEdit] = useState<Service | undefined>(undefined);
  const [selectedTeamMember, setSelectedTeamMember] = useState<TeamMember | null>(null);
  const [selectedGuestToEdit, setSelectedGuestToEdit] = useState<any | null>(null);
  const [selectedAppointmentDetail, setSelectedAppointmentDetail] = useState<any | null>(null);
  
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const downloadICS = (appt: any) => {
    if (!appt) return;
    const start = new Date(appt.date);
    const duration = appt.services?.duration || 30;
    const end = new Date(start.getTime() + duration * 60000);
    const formatDate = (d: Date) => d.toISOString().replace(/-|:|\.\d+/g, '');
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `DTSTART:${formatDate(start)}`,
      `DTEND:${formatDate(end)}`,
      `SUMMARY:Kristal Ritual: ${appt.services?.name || 'Appuntamento'}`,
      `DESCRIPTION:Rituale di bellezza con ${appt.team_member_name} presso Kristal Atelier.`,
      `LOCATION:Kristal Atelier, ${SALON_PHONE}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\n');
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `rituale-kristal-${formatDate(start).substring(0,8)}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Rituale aggiunto al tuo calendario.");
  };

  const ensureDataSeeding = useCallback(async () => {
    try {
      const existingServices = await db.services.getAll();
      if (!existingServices || existingServices.length === 0) {
        for (const s of DEFAULT_SERVICES) await db.services.upsert(s);
      }
      const existingTeam = await db.team.getAll();
      if (!existingTeam || existingTeam.length === 0) {
        for (const m of DEFAULT_TEAM) {
          await db.team.upsert({ ...m, email: m.email || `${m.name.toLowerCase()}@kristalatelier.ch` } as any);
        }
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
      refreshData();
    });
    return () => subscription.unsubscribe();
  }, [refreshData]);

  useEffect(() => {
    refreshData();
  }, [refreshData, activeTab]);

  const isAdmin = user?.role === 'admin';
  const isCollaborator = user?.role === 'collaborator';
  const isGuest = !user;

  const currentMember = useMemo(() => {
    if (!user || user.role !== 'collaborator') return null;
    return team.find(m => m.profile_id === user.id || m.name === user.fullName.split(' ')[0]);
  }, [team, user]);

  const categories = useMemo(() => {
    if (!services || services.length === 0) return [];
    return Array.from(new Set(services.map(s => s.category)));
  }, [services]);

  const groupedGuestAppointments = useMemo(() => {
    if (!user) return { upcoming: [], history: [], cancelled: [] };
    const userAppts = appointments.filter(a => String(a.client_id) === String(user.id));
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
        showToast(`Rituale aggiornato.`);
        
        if (settings.emailNotificationsEnabled && status === 'cancelled') {
          const client = profiles.find(p => p.id === appt.client_id);
          const service = services.find(s => s.id === appt.service_id);
          sendLuxuryEmailNotification({ type: 'cancellation', appointment: appt, client, service });
        }
        
        refreshData();
        setSelectedAppointmentDetail(null);
      }
    } catch (e) {
      showToast("Errore durante l'aggiornamento.", "error");
    }
  };

  const handleSaveAppointment = async (a: Partial<Appointment>) => {
    try {
      const isNew = !a.id;
      const oldAppt = isNew ? null : appointments.find(app => app.id === a.id);
      
      const client_id = (isAdmin || isCollaborator) ? (a.client_id || formInitialData?.client_id || user?.id) : user?.id;
      const savedApptData = { ...a, client_id };
      await db.appointments.upsert(savedApptData as any); 
      
      setIsFormOpen(false); 
      setFormInitialData(null); 
      await refreshData(); 
      
      showToast(isNew ? "Rituale programmato con successo." : "Rituale aggiornato.");

      // Logica Notifiche Email
      if (settings.emailNotificationsEnabled) {
        const client = profiles.find(p => p.id === client_id);
        const service = services.find(s => s.id === a.service_id);
        const fullAppt = { ...a, client_id } as Appointment;

        if (isNew) {
          showToast("Invio email di conferma...", "info");
          await sendLuxuryEmailNotification({ type: 'confirmation', appointment: fullAppt, client, service });
        } else if (oldAppt && (oldAppt.date !== a.date || oldAppt.team_member_name !== a.team_member_name)) {
          showToast("Invio email aggiornamento...", "info");
          await sendLuxuryEmailNotification({ type: 'update', appointment: fullAppt, client, service, oldData: oldAppt });
        }
      }

      if (isNew && confirm("Desideri scaricare l'appuntamento nel calendario del telefono?")) {
        const fullAppt = { ...a, services: services.find(s => s.id === a.service_id) };
        downloadICS(fullAppt);
      }
    } catch (err) {
      showToast("Errore nel salvataggio del rituale.", "error");
    }
  };

  const handleSaveStaff = async (staffData: TeamMember) => {
    try {
      await db.team.upsert(staffData);
      showToast(`Artista ${staffData.name} creato. Invito inviato a ${staffData.email}`);
      setIsNewStaffModalOpen(false);
      refreshData();
    } catch (e) {
      showToast("Errore nel salvataggio del nuovo membro.", "error");
    }
  };

  const handleSaveClosure = async () => {
    if (!newClosure.date) return;
    
    try {
      if (salonClosures.some(c => c.date === newClosure.date)) {
        showToast("Data già presente nelle chiusure.", "info");
        return;
      }
      
      const name = newClosure.name || 'Chiusura Straordinaria';
      const updatedClosures = [...salonClosures, { date: newClosure.date, name }];
      await db.salonClosures.save(updatedClosures);
      setNewClosure({ date: '', name: '' });
      await refreshData();
      showToast("Giorno festivo registrato.");
    } catch (err) {
      showToast("Errore nel salvataggio della festività.", "error");
    }
  };

  const handleDeleteClosure = async (date: string) => {
    try {
      const updated = salonClosures.filter(cl => cl.date !== date);
      await db.salonClosures.save(updated);
      await refreshData();
      showToast("Giorno festivo rimosso.");
    } catch (err) {
      showToast("Errore nella rimozione.", "error");
    }
  };

  const saveSettings = (newSettings: typeof settings) => {
    setSettings(newSettings);
    showToast("Impostazioni salvate con successo.");
  };

  const handleSocialSync = async () => {
    if (!settings.instagramToken) {
      showToast("Inserire un token Instagram valido.", "error");
      return;
    }
    showToast("Sincronizzazione social in corso...", "info");
    await new Promise(resolve => setTimeout(resolve, 1500));
    setSettings(prev => ({ ...prev, instagramIntegrationEnabled: true }));
    showToast("Galleria Instagram aggiornata.");
  };

  if (loading && !user) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-white space-y-6">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[10px] font-bold uppercase tracking-[0.5em] text-gray-400">Kristal Atelier...</p>
      </div>
    );
  }

  return (
    <>
      {toast && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[3000] animate-in slide-in-from-top-4 duration-500 w-full max-w-md px-4">
          <div className={`px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-4 border backdrop-blur-md ${toast.type === 'error' ? 'bg-red-900/90 border-red-500/30' : toast.type === 'info' ? 'bg-amber-600/90 border-amber-500/30' : 'bg-black/90 border-amber-500/30'} text-white`}>
            <i className={`fas ${toast.type === 'error' ? 'fa-exclamation-circle' : toast.type === 'info' ? 'fa-sync fa-spin' : 'fa-check-circle'} ${toast.type === 'error' ? 'text-red-400' : 'text-white'}`}></i>
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
                  <p className="text-amber-600 text-[10px] font-bold uppercase tracking-[0.4em] mt-2">La vostra storia in Atelier</p>
               </div>
               <div className="w-16 h-16 bg-black text-white rounded-[2rem] flex items-center justify-center shadow-2xl"><i className="fas fa-gem text-xl"></i></div>
             </header>

             <section className="space-y-8">
               <h3 className="text-[11px] font-bold uppercase tracking-[0.3em] text-amber-600 border-l-4 border-amber-600 pl-4">Prossime Sessioni</h3>
               <div className="grid md:grid-cols-2 gap-8">
                 {groupedGuestAppointments.upcoming.length > 0 ? groupedGuestAppointments.upcoming.map(a => (
                   <div key={a.id} className="bg-white p-12 rounded-[4rem] border border-gray-100 flex flex-col justify-between shadow-sm hover:shadow-2xl transition-all group">
                      <div className="flex justify-between items-start mb-10">
                         <div className="w-20 h-20 bg-black text-white rounded-[2rem] flex flex-col items-center justify-center group-hover:bg-amber-600 transition-colors shadow-lg">
                            <span className="text-[10px] uppercase font-bold text-amber-500 group-hover:text-white">{new Date(a.date).toLocaleDateString('it-IT', { month: 'short' })}</span>
                            <span className="text-3xl font-luxury font-bold">{new Date(a.date).getDate()}</span>
                         </div>
                         <div className="text-right flex flex-col items-end gap-3">
                            <span className="px-4 py-2 bg-green-50 text-green-700 text-[9px] font-bold uppercase rounded-full border border-green-100">Confermato</span>
                            <button onClick={() => downloadICS(a)} className="text-[9px] font-bold text-amber-600 uppercase tracking-widest flex items-center gap-2 hover:text-black transition-colors"><i className="fas fa-calendar-plus"></i> Calendario</button>
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
                              <p className="text-[10px] text-gray-400 font-medium leading-relaxed">Assistenza Atelier:</p>
                              <a href={`tel:${SALON_PHONE.replace(/[^\d+]/g, '')}`} className="text-gray-900 font-bold text-xs hover:text-amber-600 transition-colors">{SALON_PHONE}</a>
                           </div>
                           <a href={`tel:${SALON_PHONE.replace(/[^\d+]/g, '')}`} className="w-14 h-14 bg-black text-white rounded-[1.5rem] flex items-center justify-center hover:bg-amber-600 transition-all shadow-xl shadow-black/10">
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

        {activeTab === 'services_management' && isAdmin && (
          <div className="space-y-12 animate-in fade-in">
             <header className="flex items-center justify-between">
                <div>
                   <h2 className="text-5xl font-luxury font-bold text-gray-900">Gestione Ritual</h2>
                   <p className="text-amber-600 text-[10px] font-bold uppercase tracking-[0.5em] mt-2">Personalizza il Menù Esperienze</p>
                </div>
                <button onClick={() => { setSelectedServiceToEdit(undefined); setIsServiceFormOpen(true); }} className="w-16 h-16 bg-black text-white rounded-[2rem] flex items-center justify-center shadow-2xl hover:bg-amber-600 transition-all"><i className="fas fa-plus"></i></button>
             </header>
             <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {services.map(s => (
                  <div key={s.id} className="bg-white p-8 rounded-[3rem] border border-gray-50 shadow-sm hover:shadow-xl transition-all group">
                     <div className="flex justify-between items-start mb-6">
                        <span className="px-4 py-1.5 bg-gray-50 text-[8px] font-bold uppercase tracking-widest rounded-full">{s.category}</span>
                        <div className="flex gap-2">
                           <button onClick={() => { setSelectedServiceToEdit(s); setIsServiceFormOpen(true); }} className="w-8 h-8 bg-gray-50 text-gray-400 rounded-xl hover:text-black transition-colors"><i className="fas fa-edit text-xs"></i></button>
                        </div>
                     </div>
                     <h4 className="text-xl font-luxury font-bold text-gray-900 mb-1">{s.name}</h4>
                     <p className="text-[10px] text-gray-400 font-bold uppercase mb-6">{s.duration} min</p>
                     <div className="flex items-center justify-between pt-6 border-t border-gray-50">
                        <p className="text-2xl font-luxury font-bold">CHF {s.price}</p>
                     </div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {activeTab === 'vacation_planning' && isAdmin && (
          <div className="space-y-16 animate-in fade-in">
             <header>
                <h2 className="text-5xl font-luxury font-bold text-gray-900">Centro Congedi</h2>
                <p className="text-amber-600 text-[10px] font-bold uppercase tracking-[0.5em] mt-2">Gestione Assenze e Chiusure Atelier</p>
             </header>
             <div className="grid lg:grid-cols-2 gap-12">
                <div className="space-y-8">
                   <h3 className="text-[11px] font-bold uppercase tracking-[0.3em] text-gray-900 border-l-4 border-amber-600 pl-4">Richieste Staff</h3>
                   <RequestManagement 
                     requests={requests} 
                     onAction={async (id, action) => { 
                       await db.requests.update(id, { status: action }); 
                       if (action === 'approved') {
                          const req = requests.find(r => r.id === id);
                          const member = team.find(t => t.name === req?.member_name);
                          if (member && req) {
                             const newAbsence = { id: Math.random().toString(36).substr(2,9), startDate: req.start_date, endDate: req.end_date, type: req.type, isFullDay: req.is_full_day };
                             await db.team.upsert({ ...member, absences_json: [...(member.absences_json || []), newAbsence] });
                          }
                       }
                       refreshData(); 
                     }} 
                   />
                </div>
                <div className="space-y-8">
                   <h3 className="text-[11px] font-bold uppercase tracking-[0.3em] text-gray-900 border-l-4 border-black pl-4">Festività & Chiusure Globali</h3>
                   <div className="bg-white p-10 rounded-[4rem] border border-gray-50 shadow-sm space-y-8">
                      <div className="space-y-4">
                         <div className="grid grid-cols-2 gap-4">
                            <input 
                              type="date" 
                              value={newClosure.date} 
                              onChange={(e) => setNewClosure({ ...newClosure, date: e.target.value })}
                              className="p-4 rounded-2xl bg-gray-50 border-none font-bold text-xs shadow-inner focus:ring-2 focus:ring-amber-500 transition-all" 
                            />
                            <input 
                              type="text" 
                              placeholder="Nome Festività" 
                              value={newClosure.name}
                              onChange={(e) => setNewClosure({ ...newClosure, name: e.target.value })}
                              className="p-4 rounded-2xl bg-gray-50 border-none font-bold text-xs shadow-inner focus:ring-2 focus:ring-amber-500 transition-all" 
                            />
                         </div>
                         <button 
                            onClick={handleSaveClosure}
                            className="w-full py-4 bg-black text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-lg hover:bg-amber-700 transition-all active:scale-95"
                         >
                            Registra Chiusura
                         </button>
                      </div>
                      <div className="grid gap-3 max-h-[300px] overflow-y-auto scrollbar-hide pr-2">
                         {salonClosures.map(c => (
                           <div key={c.date} className="p-5 bg-gray-50 rounded-3xl flex justify-between items-center group animate-in slide-in-from-left-4">
                              <div>
                                 <p className="text-[10px] font-bold text-gray-900 uppercase">{c.name}</p>
                                 <p className="text-[8px] font-bold text-gray-400 uppercase">{new Date(c.date).toLocaleDateString('it-IT', {day:'numeric', month:'long'})}</p>
                              </div>
                              <button onClick={() => handleDeleteClosure(c.date)} className="text-gray-300 hover:text-red-500 transition-colors p-3"><i className="fas fa-trash text-sm"></i></button>
                           </div>
                         ))}
                         {salonClosures.length === 0 && (
                           <p className="text-center py-6 text-gray-300 text-[9px] font-bold uppercase tracking-widest italic">Nessun giorno festivo programmato</p>
                         )}
                      </div>
                   </div>
                </div>
             </div>
          </div>
        )}

        {activeTab === 'team_management' && isAdmin && (
          <div className="space-y-12 animate-in fade-in">
             <header className="flex items-center justify-between">
                <div>
                   <h2 className="text-5xl font-luxury font-bold text-gray-900">Il Tuo Team</h2>
                   <p className="text-amber-600 text-[10px] font-bold uppercase tracking-[0.5em] mt-2">Gestione Profili Artisti</p>
                </div>
                <button onClick={() => setIsNewStaffModalOpen(true)} className="w-16 h-16 bg-black text-white rounded-[2rem] flex items-center justify-center shadow-2xl hover:bg-amber-600 transition-all">
                  <i className="fas fa-plus"></i>
                </button>
             </header>
             <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
                {team.map(m => (
                   <div key={m.name} onClick={() => { setSelectedTeamMember(m); setIsTeamEditorOpen(true); }} className="bg-white p-10 rounded-[4rem] border border-gray-50 shadow-sm hover:shadow-2xl transition-all cursor-pointer group">
                      <div className="relative mb-8 text-center">
                         <img src={m.avatar || `https://ui-avatars.com/api/?name=${m.name}`} className="w-24 h-24 rounded-[2rem] object-cover border-4 border-white shadow-xl mx-auto" />
                         <div className="absolute -bottom-2 right-1/2 translate-x-12 w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center shadow-lg group-hover:bg-amber-600 transition-colors"><i className="fas fa-cog text-xs"></i></div>
                      </div>
                      <div className="text-center">
                         <h4 className="text-2xl font-luxury font-bold text-gray-900">{m.name}</h4>
                         <p className="text-[9px] text-amber-600 font-bold uppercase tracking-[0.3em] mt-1">{m.role}</p>
                         <p className="text-[8px] text-gray-400 font-medium lowercase tracking-tighter mt-1">{m.email}</p>
                         <div className="mt-8 pt-8 border-t border-gray-50 flex justify-center gap-6">
                            <div className="text-center"><p className="text-[10px] font-bold text-gray-900">{m.work_start_time || '08:30'}</p><p className="text-[7px] text-gray-400 uppercase font-bold">Inizio</p></div>
                            <div className="text-center"><p className="text-[10px] font-bold text-gray-900">{m.work_end_time || '18:30'}</p><p className="text-[7px] text-gray-400 uppercase font-bold">Fine</p></div>
                         </div>
                      </div>
                   </div>
                ))}
             </div>
          </div>
        )}

        {activeTab === 'clients' && (isAdmin || isCollaborator) && (
          <div className="animate-in fade-in">
             <GuestManagement 
               profiles={profiles} 
               appointments={appointments} 
               onRefresh={refreshData} 
               onEditGuest={(guest) => { setSelectedGuestToEdit(guest); setIsGuestEditorOpen(true); }}
               onAddGuest={() => { setSelectedGuestToEdit(null); setIsGuestEditorOpen(true); }}
             />
          </div>
        )}

        {activeTab === 'team_schedule' && (isAdmin || isCollaborator) && (
          <div className="space-y-12 animate-in fade-in">
            <h2 className="text-4xl font-luxury font-bold text-gray-900">Agenda Atelier</h2>
            <TeamPlanning 
              team={team} appointments={appointments} onToggleVacation={() => {}} 
              onSlotClick={(memberName, date, hour) => { setFormInitialData({ team_member_name: memberName, date: new Date(`${date}T${hour}:00`).toISOString() }); setIsFormOpen(true); }} 
              onAppointmentClick={(a) => setSelectedAppointmentDetail(a)}
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
                      <button onClick={() => { 
                        const newVal = !settings.aiAssistantEnabled;
                        setSettings({...settings, aiAssistantEnabled: newVal});
                        showToast(`Assistente AI ${newVal ? 'attivato' : 'disattivato'}.`);
                      }} className={`w-16 h-9 rounded-full transition-all relative ${settings.aiAssistantEnabled ? 'bg-amber-600' : 'bg-gray-200'}`}><div className={`absolute top-1.5 w-6 h-6 bg-white rounded-full transition-all ${settings.aiAssistantEnabled ? 'left-9' : 'left-1.5'}`}></div></button>
                    </div>
                    <div className="p-8 bg-gray-50 rounded-[3rem] border border-gray-100">
                       <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Numero Emergenze Atelier</p>
                       <p className="text-xl font-luxury font-bold text-gray-900">{SALON_PHONE}</p>
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
                      <div className="flex items-center justify-between px-6"><span className="text-[10px] font-bold uppercase tracking-[0.3em]">Attiva Portfolio Gallery</span><button onClick={() => {
                        const newVal = !settings.instagramIntegrationEnabled;
                        setSettings({...settings, instagramIntegrationEnabled: newVal});
                        showToast(`Portfolio Instagram ${newVal ? 'attivata' : 'disattivata'}.`);
                      }} className={`w-16 h-9 rounded-full transition-all relative ${settings.instagramIntegrationEnabled ? 'bg-amber-600' : 'bg-gray-200'}`}><div className={`absolute top-1.5 w-6 h-6 bg-white rounded-full transition-all ${settings.instagramIntegrationEnabled ? 'left-9' : 'left-1.5'}`}></div></button></div>
                      <button onClick={handleSocialSync} className="w-full py-6 bg-black text-white rounded-[2.5rem] font-bold uppercase text-[11px] tracking-[0.4em] shadow-2xl hover:bg-amber-700 transition-all active:scale-95">Sincronizza Social</button>
                   </div>
                </div>
             </div>
          </div>
        )}
      </Layout>

      {/* Modals */}
      {settings.aiAssistantEnabled && <AIAssistant />}

      {isNewStaffModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[2100] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-2xl rounded-[5rem] p-16 shadow-2xl relative overflow-y-auto max-h-[92vh]">
             <button onClick={() => setIsNewStaffModalOpen(false)} className="absolute top-10 right-12 text-gray-300 hover:text-black"><i className="fas fa-times text-3xl"></i></button>
             <NewStaffForm 
               onSave={handleSaveStaff} 
               onCancel={() => setIsNewStaffModalOpen(false)} 
             />
          </div>
        </div>
      )}

      {isTeamEditorOpen && selectedTeamMember && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[2100] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-2xl rounded-[5rem] p-16 shadow-2xl relative overflow-y-auto max-h-[92vh]">
             <button onClick={() => setIsTeamEditorOpen(false)} className="absolute top-10 right-12 text-gray-300 hover:text-black"><i className="fas fa-times text-3xl"></i></button>
             <TeamManagement 
               member={selectedTeamMember} 
               appointments={appointments} 
               services={services} 
               profiles={profiles} 
               onSave={async (m) => { await db.team.upsert(m); setIsTeamEditorOpen(false); refreshData(); showToast("Profilo staff aggiornato."); }} 
               onClose={() => setIsTeamEditorOpen(false)} 
             />
          </div>
        </div>
      )}

      {isGuestEditorOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[2100] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-xl rounded-[5rem] p-16 shadow-2xl relative overflow-y-auto max-h-[92vh]">
             <button onClick={() => setIsGuestEditorOpen(false)} className="absolute top-10 right-12 text-gray-300 hover:text-black"><i className="fas fa-times text-3xl"></i></button>
             <NewGuestForm 
               initialData={selectedGuestToEdit} 
               onSave={async (g) => { await db.profiles.upsert(g); setIsGuestEditorOpen(false); refreshData(); showToast("Profilo ospite salvato."); }} 
               onCancel={() => setIsGuestEditorOpen(false)} 
             />
          </div>
        </div>
      )}

      {isServiceFormOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[2100] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-xl rounded-[5rem] p-16 shadow-2xl relative overflow-y-auto max-h-[92vh]">
             <button onClick={() => setIsServiceFormOpen(false)} className="absolute top-10 right-12 text-gray-300 hover:text-black"><i className="fas fa-times text-3xl"></i></button>
             <ServiceForm 
               initialData={selectedServiceToEdit} 
               onSave={async (s) => { await db.services.upsert(s); setIsServiceFormOpen(false); refreshData(); showToast("Ritual salvato."); }} 
               onCancel={() => setIsServiceFormOpen(false)} 
             />
          </div>
        </div>
      )}

      {isFormOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[1800] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-3xl rounded-[5rem] p-16 shadow-2xl relative overflow-y-auto max-h-[92vh]">
             <button onClick={() => { setIsFormOpen(false); setFormInitialData(null); }} className="absolute top-10 right-12 text-gray-300 hover:text-black"><i className="fas fa-times text-3xl"></i></button>
             {/* Corrected prop name 'existingAppointments' and removed 'existing' placeholder */}
             <AppointmentForm 
               services={services} team={team} existingAppointments={appointments} 
               onSave={handleSaveAppointment} 
               onCancel={() => { setIsFormOpen(false); setFormInitialData(null); }} 
               isAdminOrStaff={isAdmin || isCollaborator} profiles={profiles} initialData={formInitialData}
               salonClosures={salonClosures.map(c => c.date)}
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
               <button onClick={() => { setFormInitialData(selectedAppointmentDetail); setSelectedAppointmentDetail(null); setIsFormOpen(true); }} className="py-5 bg-gray-50 text-black border border-gray-100 rounded-3xl text-[10px] font-bold uppercase tracking-widest hover:bg-white hover:shadow-lg transition-all">Modifica</button>
               <button onClick={() => handleUpdateAppointmentStatus(selectedAppointmentDetail.id, 'cancelled')} className="py-5 bg-red-50 text-red-600 border border-red-100 rounded-3xl text-[10px] font-bold uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all">Annulla</button>
               <button onClick={() => downloadICS(selectedAppointmentDetail)} className="col-span-2 py-5 bg-amber-50 text-amber-600 rounded-3xl text-[11px] font-bold uppercase tracking-widest flex items-center justify-center gap-3"><i className="fas fa-calendar-plus"></i> Aggiungi al Calendario</button>
               <button onClick={() => handleUpdateAppointmentStatus(selectedAppointmentDetail.id, 'confirmed')} className="col-span-2 py-6 bg-black text-white rounded-3xl text-[11px] font-bold uppercase tracking-widest shadow-2xl shadow-black/20 hover:bg-amber-700 transition-all">Conferma Ritual</button>
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
