
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Layout, { NotificationItem } from './components/Layout';
import Auth from './components/Auth';
import AppointmentForm from './components/AppointmentForm';
import ServiceForm from './components/ServiceForm';
import TeamManagement from './components/TeamManagement';
import HRManagement from './components/HRManagement'; 
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
import { Service, User, TeamMember, Appointment, LeaveRequest, SalonClosure, AboutUsContent, AbsenceEntry } from './types';
import { SERVICES as DEFAULT_SERVICES, TEAM as DEFAULT_TEAM } from './constants';
import { sendLuxuryEmailNotification } from './services/emailService';

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
  const [aboutUs, setAboutUs] = useState<AboutUsContent | null>(null);
  
  // Notifications State
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Modal states
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
  
  // New State for Booking Success Modal
  const [confirmedBooking, setConfirmedBooking] = useState<Appointment | null>(null);
  
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const addNotification = (title: string, body: string) => {
    const newNotif: NotificationItem = {
      id: Math.random().toString(36).substr(2, 9),
      title,
      body,
      time: new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
      read: false
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  const handleAtelierImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && aboutUs) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAboutUs({ ...aboutUs, imageUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
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
          await db.team.upsert({ 
            ...m, 
            email: m.email || `${m.name.toLowerCase()}@kristalatelier.ch`,
            total_vacation_days_per_year: 25,
            hours_per_day_contract: 8.5,
            overtime_balance_hours: 0,
            absences_json: []
          } as any);
        }
      }
    } catch (e) {
      console.warn("Seeding error:", e);
    }
  }, []);

  const refreshData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      await ensureDataSeeding();
      const [svcs, tm, appts, reqs, profs, closures, about] = await Promise.all([
        db.services.getAll(),
        db.team.getAll(),
        db.appointments.getAll(),
        db.requests.getAll(),
        db.profiles.getAll(),
        db.salonClosures.getAll(),
        db.aboutUs.get()
      ]);
      setServices(svcs || []);
      setTeam(tm || []);
      setAppointments(appts || []);
      setRequests(reqs || []);
      setProfiles(profs || []);
      setSalonClosures(closures || []);
      setAboutUs(about || null);
    } catch (e) {
      console.error("Data Refresh Error", e);
    } finally {
      setLoading(false);
    }
  }, [ensureDataSeeding]);

  useEffect(() => {
    // Force data load immediately
    refreshData();

    // Safety timeout to prevent infinite loading screen
    const safetyTimer = setTimeout(() => {
        setLoading(false);
    }, 4000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setActiveTab('dashboard');
      } else if (session?.user) {
        setIsAuthOpen(false); 
        
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
    return () => {
        subscription.unsubscribe();
        clearTimeout(safetyTimer);
    };
  }, [refreshData]);

  const isAdmin = user?.role === 'admin';
  const isCollaborator = user?.role === 'collaborator';
  const isGuest = !user;

  const currentMember = useMemo(() => {
    if (!user || user.role !== 'collaborator') return null;
    return team.find(m => m.profile_id === user.id || m.name === user.fullName.split(' ')[0]);
  }, [team, user]);

  const categories = useMemo(() => {
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
        
        if (status === 'cancelled' && settings.emailNotificationsEnabled) {
          const clientProfile = profiles.find(p => p.id === appt.client_id);
          const serviceInfo = services.find(s => s.id === appt.service_id);
          if (clientProfile) {
            const emailBody = await sendLuxuryEmailNotification({
              type: 'cancellation',
              appointment: appt,
              client: clientProfile,
              service: serviceInfo
            });
            if (emailBody) {
               addNotification('Cancellazione Ritual', emailBody);
            }
          }
        }

        showToast(`Rituale aggiornato.`);
        refreshData(true);
        setSelectedAppointmentDetail(null);
      }
    } catch (e) {
      showToast("Errore aggiornamento.", "error");
    }
  };

  const formatICSDate = (date: Date) => {
    return date.toISOString().replace(/-|:|\.\d+/g, '').split('T')[0] + 'T' + date.toISOString().replace(/-|:|\.\d+/g, '').split('T')[1].slice(0, 6) + 'Z';
  };

  const downloadICS = (appt: any) => {
    const start = new Date(appt.date);
    const duration = appt.services?.duration || 30;
    const end = new Date(start.getTime() + duration * 60 * 1000);
    
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `DTSTART:${formatICSDate(start)}`,
      `DTEND:${formatICSDate(end)}`,
      `SUMMARY:Kristal Atelier - ${appt.services?.name || 'Rituale di Bellezza'}`,
      `DESCRIPTION:Rituale di bellezza con ${appt.team_member_name}`,
      `LOCATION:Kristal Atelier, Lugano`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `rituale-kristal-${appt.id}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveAppointment = async (a: Partial<Appointment>) => {
    try {
      const isEdit = !!a.id;
      const client_id = (isAdmin || isCollaborator) ? (a.client_id || formInitialData?.client_id) : user?.id;
      const savedApptData = { ...a, client_id };
      
      const result = await db.appointments.upsert(savedApptData as any); 
      const apptToNotify = result || savedApptData;

      setIsFormOpen(false); 
      setFormInitialData(null); 
      
      if (!isEdit && !isAdmin && !isCollaborator) {
         const fullService = services.find(s => s.id === a.service_id);
         setConfirmedBooking({ ...apptToNotify, services: fullService } as Appointment);
      } else {
         showToast(isEdit ? "Rituale aggiornato." : "Rituale programmato.");
      }

      if (settings.emailNotificationsEnabled) {
        const clientProfile = profiles.find(p => p.id === client_id);
        const serviceInfo = services.find(s => s.id === a.service_id);
        const oldData = isEdit ? appointments.find(ex => ex.id === a.id) : null;
        
        if (clientProfile) {
           sendLuxuryEmailNotification({
            type: isEdit ? 'update' : 'confirmation',
            appointment: apptToNotify as any,
            client: clientProfile,
            service: serviceInfo,
            oldData: oldData
          }).then(emailBody => {
            if (emailBody) {
               addNotification(isEdit ? 'Modifica Ritual' : 'Conferma Ritual', emailBody);
               if (isEdit || isAdmin || isCollaborator) showToast("Email di notifica inviata al cliente.", "info");
            }
          });
        }
      }

      await refreshData(true); 
    } catch (err) {
      showToast("Errore nel salvataggio.", "error");
    }
  };

  const handleSaveClosure = async () => {
    if (!newClosure.date) return;
    try {
      if (salonClosures.some(c => c.date === newClosure.date)) {
        showToast("Data già registrata.", "info");
        return;
      }
      const updated = [...salonClosures, { date: newClosure.date, name: newClosure.name || 'Chiusura Atelier' }];
      await db.salonClosures.save(updated);
      setNewClosure({ date: '', name: '' });
      await refreshData(true);
      showToast("Chiusura registrata.");
    } catch (err) {
      showToast("Errore salvataggio.", "error");
    }
  };

  const handleDeleteClosure = async (date: string) => {
    try {
      await db.salonClosures.delete(date);
      await refreshData(true);
      showToast("Chiusura rimossa.");
    } catch (err) {
      showToast("Errore rimozione.", "error");
    }
  };

  const handleSaveAboutUs = async (content: AboutUsContent) => {
    try {
      await db.aboutUs.save(content);
      setAboutUs(content);
      showToast("Contenuti Atelier aggiornati.");
    } catch (e) {
      showToast("Errore salvataggio.", "error");
    }
  };

  const handleSaveStaff = async (member: TeamMember) => {
    try {
      await db.team.upsert(member);
      setIsNewStaffModalOpen(false);
      setIsTeamEditorOpen(false);
      await refreshData(true);
      showToast("Dati Staff aggiornati.");
    } catch (err) {
      showToast("Errore salvataggio.", "error");
    }
  };

  const handleRequestAction = async (id: string, action: 'approved' | 'rejected') => {
    try {
      const req = requests.find(r => r.id === id);
      if (!req) return;

      await db.requests.update(id, { status: action });
      
      if (action === 'approved') {
        const member = team.find(t => t.name === req.member_name);
        if (member) {
          const hoursPerDay = member.hours_per_day_contract || 8.5;
          const hoursUsed = req.is_full_day ? hoursPerDay : 4; 
          const startDateISO = new Date(req.start_date).toISOString();
          const endDateISO = new Date(req.end_date).toISOString();

          const newAbsence: AbsenceEntry = { 
            id: Math.random().toString(36).substr(2, 9), 
            startDate: startDateISO,
            endDate: endDateISO,
            type: req.type, 
            isFullDay: req.is_full_day,
            hoursCount: hoursUsed,
            notes: req.notes,
            startTime: req.start_time,
            endTime: req.end_time
          };

          let updatedOvertime = member.overtime_balance_hours || 0;
          if (req.type === 'overtime') updatedOvertime += hoursUsed;
          else if (req.type === 'overtime_recovery') updatedOvertime -= hoursUsed;

          await db.team.upsert({ 
            ...member, 
            absences_json: [...(member.absences_json || []), newAbsence],
            overtime_balance_hours: updatedOvertime
          });
        }
      }
      
      showToast(action === 'approved' ? "Richiesta approvata. Agenda bloccata." : "Richiesta respinta.");
      refreshData(true);
    } catch (e) {
      showToast("Errore durante l'elaborazione HR.", "error");
    }
  };

  const handleDeleteGuest = async (id: string) => {
    if (!confirm('Sei sicuro di voler eliminare definitivamente questo ospite e tutto il suo storico?')) return;
    try {
      await db.profiles.delete(id);
      
      // Logout di sicurezza se l'utente eliminato è quello corrente
      if (user && user.id === id) {
          await supabase.auth.signOut();
          window.location.reload();
          return;
      }

      showToast("Ospite eliminato con successo.");
      await refreshData(true); 
      setSelectedGuestToEdit(null); 
    } catch (e) {
      showToast("Errore eliminazione ospite.", "error");
    }
  };

  const handleBlockGuest = async (guest: any) => {
    const newStatus = !guest.is_blocked;
    try {
      await db.profiles.upsert({ ...guest, is_blocked: newStatus });
      showToast(newStatus ? "Ospite bloccato. Accesso negato." : "Ospite riattivato.");
      refreshData(true);
    } catch (e) {
      showToast("Errore modifica stato ospite.", "error");
    }
  };

  const handleSaveGuestFromAdmin = async (guestData: any) => {
      try {
          if (guestData.id) {
              // Modifica esistente: usa upsert DB
              const { password, ...dataToUpdate } = guestData; // Rimuovi password se presente
              await db.profiles.upsert(dataToUpdate);
              showToast("Profilo ospite aggiornato.");
          } else {
              // Creazione nuovo ospite: DEVE passare da Auth SignUp per creare l'ID e rispettare FK
              const { data, error } = await supabase.auth.signUp({
                  email: guestData.email,
                  password: guestData.password,
                  options: {
                      data: {
                          full_name: guestData.full_name,
                          phone: guestData.phone,
                          role: 'client',
                          gender: guestData.gender,
                          dob: guestData.dob,
                          avatar: guestData.avatar
                      }
                  }
              });

              if (error) throw error;
              if (data.user) {
                   showToast("Ospite creato e sincronizzato.");
              }
          }
          setIsGuestEditorOpen(false);
          await refreshData(true);
      } catch (err: any) {
          console.error("Errore salvataggio ospite:", err);
          showToast(err.message || "Errore durante il salvataggio.", "error");
      }
  };

  // Modified loading check: allow rendering if aboutUs is null but show basic UI if loading is true AND no critical data
  if (loading && !aboutUs && !services.length) {
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
          <div className={`px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-4 border backdrop-blur-md ${toast.type === 'error' ? 'bg-red-900/90 border-red-500/30' : 'bg-black/90 border-amber-500/30'} text-white`}>
            <i className={`fas ${toast.type === 'error' ? 'fa-exclamation-circle' : 'fa-check-circle'} text-white`}></i>
            <p className="text-[11px] font-bold uppercase tracking-widest">{toast.message}</p>
          </div>
        </div>
      )}

      <Layout 
        user={user} 
        onLogout={() => supabase.auth.signOut()} 
        onLoginClick={() => setIsAuthOpen(true)} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        notifications={notifications}
        onClearNotifications={() => setNotifications([])}
      >
        
        {activeTab === 'dashboard' && (
          <div className="space-y-16 animate-in fade-in duration-1000">
            {isAdmin ? (
               <VisionAnalytics team={team} appointments={appointments} services={services} />
            ) : isCollaborator && currentMember ? (
                <CollaboratorDashboard 
                  member={currentMember} appointments={appointments} requests={requests} user={user!} 
                  onSendRequest={async (r) => { await db.requests.create({...r, member_name: currentMember.name}); refreshData(true); }}
                  onUpdateProfile={async (p) => { await db.profiles.upsert({ ...profiles.find(pr => pr.id === user?.id), ...p }); refreshData(true); }}
                  onAddManualAppointment={() => { setFormInitialData(null); setIsFormOpen(true); }}
                />
            ) : (
                <div className="space-y-20">
                  <header className="text-center space-y-4">
                    <h2 className="text-7xl font-luxury font-bold text-gray-900 tracking-tighter">Kristal</h2>
                    <p className="text-amber-600 text-[10px] font-bold uppercase tracking-[0.5em]">Atelier di Bellezza Luxury</p>
                  </header>
                  <div className="grid md:grid-cols-2 gap-12">
                    {categories.map(cat => (
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
                    ))}
                  </div>
                  {settings.instagramIntegrationEnabled && settings.instagramToken && <InstagramGallery token={settings.instagramToken} />}
                </div>
            )}
          </div>
        )}

        {/* ... Altri tab invariati ... */}
        {activeTab === 'team_management' && isAdmin && (
           <HRManagement 
             team={team} 
             onEditMember={(m) => { setSelectedTeamMember(m); setIsTeamEditorOpen(true); }} 
             onAddMember={() => setIsNewStaffModalOpen(true)}
             onUpdateMember={handleSaveStaff}
           />
        )}

        {/* ... Tab About Us e Services Management invariati ... */}
        {activeTab === 'about_us' && (
          <div className="space-y-24 animate-in fade-in duration-1000 max-w-6xl mx-auto pb-20">
             {aboutUs ? (
               <div className="space-y-32">
                  <div className="space-y-12">
                    <header className="text-center space-y-4">
                       <h2 className="text-7xl font-luxury font-bold text-gray-900 leading-tight tracking-tighter">{aboutUs.title}</h2>
                       <p className="text-amber-600 text-[14px] font-bold uppercase tracking-[0.6em]">{aboutUs.subtitle}</p>
                    </header>
                    <div className="relative aspect-[21/9] rounded-[5rem] overflow-hidden shadow-2xl border-[12px] border-white group">
                      <img src={aboutUs.imageUrl} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" alt="Kristal Atelier" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-20 items-center">
                    <div className="prose prose-stone max-w-none">
                       <p className="text-3xl font-luxury font-bold text-gray-900 mb-8 leading-tight">La Filosofia Kristal</p>
                       <p className="text-xl font-light leading-relaxed text-gray-600 italic border-l-4 border-amber-600 pl-8">
                         {aboutUs.description}
                       </p>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                       <div className="aspect-square bg-gray-50 rounded-[3rem] flex flex-col items-center justify-center p-8 text-center space-y-4 hover:shadow-xl transition-all">
                          <i className="fas fa-history text-amber-600 text-3xl"></i>
                          <h4 className="font-bold uppercase text-[10px] tracking-widest">Heritage</h4>
                       </div>
                       <div className="aspect-square bg-black text-white rounded-[3rem] flex flex-col items-center justify-center p-8 text-center space-y-4 shadow-2xl">
                          <i className="fas fa-medal text-amber-600 text-3xl"></i>
                          <h4 className="font-bold uppercase text-[10px] tracking-widest text-amber-500">Eccellenza</h4>
                       </div>
                    </div>
                  </div>

                  <div className="space-y-16">
                     <div className="text-center space-y-2">
                        <h3 className="text-5xl font-luxury font-bold text-gray-900">Gli Artisti</h3>
                        <p className="text-amber-600 text-[10px] font-bold uppercase tracking-[0.4em]">Il talento dietro ogni rituale</p>
                     </div>
                     <div className="grid md:grid-cols-3 gap-12">
                        {team.map((member) => (
                           <div key={member.name} className="group space-y-6">
                              <div className="relative aspect-[3/4] rounded-[4rem] overflow-hidden shadow-xl border-4 border-white transition-all group-hover:shadow-2xl">
                                 <img src={member.avatar || `https://ui-avatars.com/api/?name=${member.name}`} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt={member.name} />
                                 <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-10">
                                    <p className="text-white text-xl font-bold uppercase tracking-tighter">{member.name}</p>
                                 </div>
                              </div>
                              <div className="text-center space-y-2 px-6">
                                 <h5 className="text-xl font-luxury font-bold">{member.name}</h5>
                                 <p className="text-[10px] text-amber-600 font-bold uppercase tracking-widest">{member.role}</p>
                                 <p className="text-xs text-gray-500 leading-relaxed italic">{member.bio || 'Esperto rituali Kristal'}</p>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               </div>
             ) : (
               <div className="py-24 text-center">
                  <p className="text-gray-400 text-[10px] font-bold uppercase tracking-[0.4em]">In attesa dei contenuti della Maison...</p>
               </div>
             )}
          </div>
        )}

        {activeTab === 'about_management' && isAdmin && (
          <div className="space-y-12 animate-in fade-in max-w-4xl mx-auto">
             <header>
                <h2 className="text-5xl font-luxury font-bold text-gray-900">Editor Atelier</h2>
                <p className="text-amber-600 text-[10px] font-bold uppercase tracking-[0.5em] mt-2">Racconta la bellezza di Kristal</p>
             </header>
             <div className="bg-white p-12 rounded-[5rem] border border-gray-100 shadow-sm space-y-10">
                <div className="space-y-8">
                   <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Immagine Hero Atelier</label>
                      <div className="relative aspect-[16/6] bg-gray-50 rounded-3xl overflow-hidden border-2 border-dashed border-gray-200 group cursor-pointer">
                         <img src={aboutUs?.imageUrl} className="w-full h-full object-cover group-hover:opacity-70 transition-opacity" />
                         <label className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 text-white cursor-pointer">
                            <i className="fas fa-camera text-3xl mb-2"></i>
                            <span className="text-[10px] font-bold uppercase">Carica Foto Atelier</span>
                            <input type="file" accept="image/*" className="hidden" onChange={handleAtelierImageUpload} />
                         </label>
                      </div>
                   </div>
                   <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                         <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Titolo</label>
                         <input type="text" value={aboutUs?.title || ''} onChange={e => setAboutUs(prev => prev ? {...prev, title: e.target.value} : null)} className="w-full p-5 rounded-3xl bg-gray-50 border-none font-bold text-lg" />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Sottotitolo</label>
                         <input type="text" value={aboutUs?.subtitle || ''} onChange={e => setAboutUs(prev => prev ? {...prev, subtitle: e.target.value} : null)} className="w-full p-5 rounded-3xl bg-gray-50 border-none font-bold text-sm" />
                      </div>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Narrazione (Bio Atelier)</label>
                      <textarea rows={8} value={aboutUs?.description || ''} onChange={e => setAboutUs(prev => prev ? {...prev, description: e.target.value} : null)} className="w-full p-5 rounded-3xl bg-gray-50 border-none font-medium text-sm leading-relaxed resize-none" />
                   </div>
                </div>
                <button onClick={() => aboutUs && handleSaveAboutUs(aboutUs)} className="w-full py-6 bg-black text-white rounded-[2.5rem] font-bold uppercase text-[11px] tracking-[0.4em] shadow-2xl hover:bg-amber-700 transition-all active:scale-95">Pubblica Modifiche</button>
             </div>
          </div>
        )}

        {activeTab === 'services_management' && isAdmin && (
          <div className="space-y-12 animate-in fade-in">
             <header className="flex items-center justify-between">
                <div>
                   <h2 className="text-5xl font-luxury font-bold text-gray-900">Gestione Ritual</h2>
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
                     <p className="text-2xl font-luxury font-bold pt-6 border-t border-gray-50">CHF {s.price}</p>
                  </div>
                ))}
             </div>
          </div>
        )}

        {activeTab === 'vacation_planning' && isAdmin && (
          <div className="space-y-16 animate-in fade-in">
             <header><h2 className="text-5xl font-luxury font-bold text-gray-900">Centro Congedi</h2></header>
             <div className="grid lg:grid-cols-2 gap-12">
                <div className="space-y-8">
                   <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-900 border-l-4 border-amber-600 pl-4">Richieste Staff</h3>
                   <RequestManagement 
                     requests={requests} 
                     onAction={handleRequestAction} 
                   />
                </div>
                <div className="space-y-8">
                   <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-900 border-l-4 border-black pl-4">Festività & Chiusure Globali</h3>
                   <div className="bg-white p-10 rounded-[4rem] border border-gray-50 shadow-sm space-y-8">
                      <div className="grid grid-cols-2 gap-4">
                         <input type="date" value={newClosure.date} onChange={(e) => setNewClosure({ ...newClosure, date: e.target.value })} className="p-4 rounded-2xl bg-gray-50 border-none font-bold text-xs" />
                         <input type="text" placeholder="Nome Festività" value={newClosure.name} onChange={(e) => setNewClosure({ ...newClosure, name: e.target.value })} className="p-4 rounded-2xl bg-gray-50 border-none font-bold text-xs" />
                      </div>
                      <button onClick={handleSaveClosure} className="w-full py-4 bg-black text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-lg hover:bg-amber-700 transition-all">Registra Chiusura</button>
                      <div className="grid gap-3 max-h-[300px] overflow-y-auto scrollbar-hide">
                         {salonClosures.map(c => (
                           <div key={c.date} className="p-5 bg-gray-50 rounded-3xl flex justify-between items-center group">
                              <div><p className="text-[10px] font-bold text-gray-900 uppercase">{c.name}</p><p className="text-[8px] font-bold text-gray-400">{new Date(c.date).toLocaleDateString('it-IT')}</p></div>
                              <button onClick={() => handleDeleteClosure(c.date)} className="text-gray-300 hover:text-red-500 transition-colors p-3"><i className="fas fa-trash text-sm"></i></button>
                           </div>
                         ))}
                      </div>
                   </div>
                </div>
             </div>
          </div>
        )}

        {activeTab === 'team_schedule' && (isAdmin || isCollaborator) && (
          <div className="space-y-12 animate-in fade-in">
            <h2 className="text-4xl font-luxury font-bold text-gray-900">Agenda Atelier</h2>
            <TeamPlanning 
              team={team} 
              appointments={appointments} 
              profiles={profiles} 
              onToggleVacation={() => {}} 
              onSlotClick={(memberName, date, hour) => { setFormInitialData({ team_member_name: memberName, date: new Date(`${date}T${hour}:00`).toISOString() }); setIsFormOpen(true); }} 
              onAppointmentClick={(a) => setSelectedAppointmentDetail(a)}
              currentUserMemberName={currentMember?.name} isCollaborator={isCollaborator}
              salonClosures={salonClosures.map(c => c.date)}
            />
          </div>
        )}

        {/* Tab Gestione Ospiti con refresh automatico */}
        {activeTab === 'clients' && (isAdmin || isCollaborator) && (
          <div className="animate-in fade-in">
             <GuestManagement 
               profiles={profiles} 
               appointments={appointments} 
               onRefresh={() => refreshData(true)} 
               onEditGuest={(guest) => { setSelectedGuestToEdit(guest); setIsGuestEditorOpen(true); }}
               onAddGuest={() => { setSelectedGuestToEdit(null); setIsGuestEditorOpen(true); }}
               onDeleteGuest={handleDeleteGuest}
               onBlockGuest={handleBlockGuest}
             />
          </div>
        )}

        {activeTab === 'my_rituals' && user && (
          <div className="space-y-20 animate-in fade-in">
             {/* ... contenuto My Rituals invariato ... */}
             <header className="flex items-center justify-between">
               <div>
                  <h2 className="text-5xl font-luxury font-bold text-gray-900">I Miei Ritual</h2>
                  <p className="text-amber-600 text-[10px] font-bold uppercase tracking-widest mt-2">La vostra storia in Atelier</p>
               </div>
               <div className="w-16 h-16 bg-black text-white rounded-[2rem] flex items-center justify-center shadow-2xl"><i className="fas fa-gem text-xl"></i></div>
             </header>

             <section className="space-y-8">
               <div className="flex items-center gap-4">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <h3 className="text-[11px] font-bold uppercase tracking-[0.3em] text-gray-900">Sessioni Programmate</h3>
               </div>
               <div className="grid md:grid-cols-2 gap-8">
                 {groupedGuestAppointments.upcoming.length > 0 ? groupedGuestAppointments.upcoming.map(a => (
                   <div key={a.id} className="bg-white p-12 rounded-[4rem] border border-amber-100 flex flex-col justify-between shadow-sm hover:shadow-2xl transition-all group border-l-8 border-l-amber-600 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-110 transition-transform"><i className="fas fa-sparkles text-6xl"></i></div>
                      <div className="flex justify-between items-start mb-10 relative z-10">
                         <div className="w-20 h-20 bg-black text-white rounded-[2.5rem] flex flex-col items-center justify-center group-hover:bg-amber-600 transition-colors shadow-lg">
                            <span className="text-[10px] uppercase font-bold text-amber-500 group-hover:text-white">{new Date(a.date).toLocaleDateString('it-IT', { month: 'short' })}</span>
                            <span className="text-3xl font-luxury font-bold">{new Date(a.date).getDate()}</span>
                         </div>
                         <div className="text-right flex flex-col items-end gap-3">
                            <span className="px-4 py-2 bg-green-50 text-green-700 text-[9px] font-bold uppercase rounded-full border border-green-100 flex items-center gap-2">
                               <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Confermato
                            </span>
                         </div>
                      </div>
                      <div className="space-y-6 relative z-10">
                        <h4 className="text-3xl font-luxury font-bold text-gray-900">{a.services?.name}</h4>
                        <div className="flex items-center gap-4">
                           <div className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-[11px] font-bold text-amber-600">{a.team_member_name[0]}</div>
                           <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">{a.team_member_name} • {new Date(a.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                        </div>
                        <div className="mt-6 pt-6 border-t border-gray-50 flex flex-wrap gap-4 items-center">
                           <button onClick={() => downloadICS(a)} className="flex-1 py-4 bg-gray-50 text-gray-700 rounded-3xl text-[9px] font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-all shadow-sm flex items-center justify-center gap-2">
                              <i className="fas fa-calendar-plus"></i> Calendario
                           </button>
                           <a href="tel:+41919234567" className="flex-1 py-4 bg-red-50 text-red-800 rounded-3xl text-[9px] font-bold uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all shadow-sm flex items-center justify-center gap-2 border border-red-100">
                              <i className="fas fa-phone-alt"></i> Annulla (Chiama)
                           </a>
                        </div>
                      </div>
                   </div>
                 )) : (
                   <div className="col-span-full py-24 text-center bg-gray-50/50 rounded-[4rem] border border-dashed border-gray-200">
                     <p className="text-gray-300 text-[10px] font-bold uppercase tracking-[0.4em]">Nessuna sessione in programma</p>
                   </div>
                 )}
               </div>
             </section>

             <section className="space-y-8">
                <h3 className="text-[11px] font-bold uppercase tracking-[0.3em] text-gray-400 border-l-4 border-gray-100 pl-4">Il Vostro Storico</h3>
                <div className="bg-white rounded-[4rem] border border-gray-50 overflow-hidden shadow-sm">
                   {groupedGuestAppointments.history.length > 0 ? groupedGuestAppointments.history.map((a, i) => (
                     <div key={a.id} className={`p-10 flex items-center justify-between transition-all border-b border-gray-50 last:border-none ${i % 2 === 0 ? 'bg-transparent' : 'bg-gray-50/20'} opacity-70 hover:opacity-100`}>
                        <div className="flex items-center gap-10">
                           <div className="text-center w-16 grayscale">
                              <p className="text-3xl font-luxury font-bold text-gray-400">{new Date(a.date).getDate()}</p>
                              <p className="text-[8px] font-bold text-gray-300 uppercase tracking-widest">{new Date(a.date).toLocaleDateString('it-IT', { month: 'short' })}</p>
                           </div>
                           <div className="space-y-1">
                              <p className="font-bold text-lg text-gray-500">{a.services?.name}</p>
                              <p className="text-[9px] text-gray-300 uppercase tracking-[0.2em]">{a.team_member_name} • {new Date(a.date).getFullYear()}</p>
                           </div>
                        </div>
                        <div className="flex items-center gap-8">
                           <span className="text-[9px] font-bold text-gray-300 uppercase tracking-widest flex items-center gap-2"><i className="fas fa-check-circle"></i> Eseguito</span>
                           <p className="font-luxury font-bold text-xl text-gray-400">CHF {a.services?.price}</p>
                        </div>
                     </div>
                   )) : (
                     <div className="p-20 text-center text-gray-300 italic text-[10px] uppercase tracking-widest">Nessun rituale nell'archivio</div>
                   )}
                </div>
             </section>
          </div>
        )}

        {/* ... Tab Impostazioni invariato ... */}
        {activeTab === 'impostazioni' && isAdmin && (
          <div className="space-y-16 animate-in fade-in">
             <h2 className="text-5xl font-luxury font-bold text-gray-900">Configurazione</h2>
             <div className="grid md:grid-cols-2 gap-12">
                <div className="bg-white p-14 rounded-[5rem] border border-gray-100 shadow-sm space-y-10">
                  <h4 className="text-[11px] font-bold uppercase tracking-[0.3em] text-gray-900 border-b pb-8">AI & Servizi</h4>
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-bold text-gray-800">Kristal AI Assistant</p>
                    <button onClick={() => setSettings({...settings, aiAssistantEnabled: !settings.aiAssistantEnabled})} className={`w-16 h-9 rounded-full transition-all relative ${settings.aiAssistantEnabled ? 'bg-amber-600' : 'bg-gray-200'}`}><div className={`absolute top-1.5 w-6 h-6 bg-white rounded-full transition-all ${settings.aiAssistantEnabled ? 'left-9' : 'left-1.5'}`}></div></button>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-bold text-gray-800">Notifiche Email</p>
                    <button onClick={() => setSettings({...settings, emailNotificationsEnabled: !settings.emailNotificationsEnabled})} className={`w-16 h-9 rounded-full transition-all relative ${settings.emailNotificationsEnabled ? 'bg-amber-600' : 'bg-gray-200'}`}><div className={`absolute top-1.5 w-6 h-6 bg-white rounded-full transition-all ${settings.emailNotificationsEnabled ? 'left-9' : 'left-1.5'}`}></div></button>
                  </div>
                  <button onClick={() => { showToast("Impostazioni salvate."); }} className="w-full py-6 bg-black text-white rounded-[2.5rem] font-bold uppercase text-[11px] tracking-[0.4em] shadow-2xl">Salva Configurazione</button>
                </div>
                <div className="bg-white p-14 rounded-[5rem] border border-gray-100 shadow-sm space-y-8">
                   <h4 className="text-[11px] font-bold uppercase tracking-[0.3em] text-gray-900 border-b pb-8">Social Integration</h4>
                   <input type="password" placeholder="Instagram Token" value={settings.instagramToken} onChange={(e) => setSettings({...settings, instagramToken: e.target.value})} className="w-full p-6 rounded-[2rem] bg-gray-50 border-none font-bold text-xs" />
                   <button onClick={() => setSettings({...settings, instagramIntegrationEnabled: !settings.instagramIntegrationEnabled})} className="w-full py-6 bg-black text-white rounded-[2.5rem] font-bold uppercase text-[11px] tracking-[0.4em] shadow-2xl">Sincronizza Social</button>
                </div>
             </div>
          </div>
        )}
      </Layout>

      {/* Modals */}
      {settings.aiAssistantEnabled && <AIAssistant />}

      {confirmedBooking && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[2500] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-md rounded-[4rem] p-12 shadow-2xl relative animate-in zoom-in-95 text-center space-y-8 border-[10px] border-white/50 bg-clip-padding">
             <div className="w-20 h-20 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto shadow-lg shadow-green-500/30">
                <i className="fas fa-check text-3xl"></i>
             </div>
             <div>
                <h3 className="text-3xl font-luxury font-bold text-gray-900 mb-2">Prenotazione Confermata</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Vi aspettiamo in Atelier</p>
             </div>
             
             <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                <p className="text-lg font-bold text-gray-900 mb-1">{confirmedBooking.services?.name}</p>
                <p className="text-xs text-gray-500 font-medium">
                  {new Date(confirmedBooking.date).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
                  <br />
                  ore {new Date(confirmedBooking.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
             </div>

             <div className="space-y-3">
                <button 
                  onClick={() => downloadICS(confirmedBooking)} 
                  className="w-full py-5 bg-black text-white rounded-3xl text-[10px] font-bold uppercase tracking-widest shadow-xl hover:bg-amber-600 transition-all flex items-center justify-center gap-3"
                >
                  <i className="fas fa-calendar-plus text-sm"></i> Aggiungi al Calendario
                </button>
                <button 
                  onClick={() => setConfirmedBooking(null)} 
                  className="w-full py-4 text-gray-400 font-bold uppercase text-[9px] tracking-widest hover:text-black transition-colors"
                >
                  Chiudi
                </button>
             </div>
          </div>
        </div>
      )}

      {isNewStaffModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[2100] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-2xl rounded-[5rem] p-16 shadow-2xl relative overflow-y-auto max-h-[92vh]">
             <button onClick={() => setIsNewStaffModalOpen(false)} className="absolute top-10 right-12 text-gray-300 hover:text-black"><i className="fas fa-times text-3xl"></i></button>
             <NewStaffForm onSave={handleSaveStaff} onCancel={() => setIsNewStaffModalOpen(false)} />
          </div>
        </div>
      )}

      {isTeamEditorOpen && selectedTeamMember && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[2100] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-2xl rounded-[5rem] p-16 shadow-2xl relative overflow-y-auto max-h-[92vh]">
             <button onClick={() => setIsTeamEditorOpen(false)} className="absolute top-10 right-12 text-gray-300 hover:text-black"><i className="fas fa-times text-3xl"></i></button>
             <TeamManagement member={selectedTeamMember} onSave={handleSaveStaff} onClose={() => setIsTeamEditorOpen(false)} />
          </div>
        </div>
      )}

      {isGuestEditorOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[2100] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-xl rounded-[5rem] p-16 shadow-2xl relative overflow-y-auto max-h-[92vh]">
             <button onClick={() => setIsGuestEditorOpen(false)} className="absolute top-10 right-12 text-gray-300 hover:text-black"><i className="fas fa-times text-3xl"></i></button>
             <NewGuestForm initialData={selectedGuestToEdit} onSave={handleSaveGuestFromAdmin} onCancel={() => setIsGuestEditorOpen(false)} />
          </div>
        </div>
      )}

      {isServiceFormOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[2100] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-xl rounded-[5rem] p-16 shadow-2xl relative overflow-y-auto max-h-[92vh]">
             <button onClick={() => setIsServiceFormOpen(false)} className="absolute top-10 right-12 text-gray-300 hover:text-black"><i className="fas fa-times text-3xl"></i></button>
             <ServiceForm initialData={selectedServiceToEdit} onSave={async (s) => { await db.services.upsert(s); setIsServiceFormOpen(false); refreshData(true); showToast("Ritual salvato."); }} onCancel={() => setIsServiceFormOpen(false)} />
          </div>
        </div>
      )}

      {isFormOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[1800] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-3xl rounded-[5rem] p-16 shadow-2xl relative overflow-y-auto max-h-[92vh]">
             <button onClick={() => { setIsFormOpen(false); setFormInitialData(null); }} className="absolute top-10 right-12 text-gray-300 hover:text-black"><i className="fas fa-times text-3xl"></i></button>
             <AppointmentForm 
               services={services} team={team} existingAppointments={appointments} 
               onSave={handleSaveAppointment} onCancel={() => { setIsFormOpen(false); setFormInitialData(null); }} 
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
               <button onClick={() => downloadICS(selectedAppointmentDetail)} className="col-span-2 py-5 bg-amber-50 text-amber-600 rounded-3xl text-[11px] font-bold uppercase tracking-widest flex items-center justify-center gap-3"><i className="fas fa-calendar-plus"></i> Calendario</button>
               <button onClick={() => handleUpdateAppointmentStatus(selectedAppointmentDetail.id, 'confirmed')} className="col-span-2 py-6 bg-black text-white rounded-3xl text-[11px] font-bold uppercase tracking-widest shadow-2xl shadow-black/20 hover:bg-amber-700 transition-all">Conferma Ritual</button>
             </div>
             <div className="mt-8 text-center">
                <p className="text-[9px] font-bold text-gray-300 uppercase tracking-widest mb-1">Per modifiche urgenti</p>
                <a href="tel:+41919234567" className="text-[12px] font-bold text-gray-900 hover:text-amber-600 transition-colors">+41 91 923 45 67</a>
             </div>
          </div>
        </div>
      )}

      {isAuthOpen && (
        <div className="fixed inset-0 bg-black/98 backdrop-blur-3xl z-[2000] flex items-center justify-center p-6">
          <div className="w-full max-w-xl relative animate-in zoom-in-95">
            <button onClick={() => setIsAuthOpen(false)} className="absolute -top-16 right-0 text-white/40 hover:text-white transition-all"><i className="fas fa-times text-4xl"></i></button>
            <Auth onLogin={(u) => { setUser(u); setIsAuthOpen(false); refreshData(true); }} />
          </div>
        </div>
      )}
    </>
  );
};

export default App;
