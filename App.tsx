
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Auth from './components/Auth';
import AIAssistant from './components/AIAssistant';
import AppointmentForm from './components/AppointmentForm';
import { supabase, db } from './services/supabase';
import { Service, User, TeamMember, TreatmentRecord, AppSettings } from './types';
import { SERVICES as DEFAULT_SERVICES, TEAM as DEFAULT_TEAM } from './constants';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { fetchInstagramPhotos, InstagramPost } from './services/instagramService';

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
  const [settings, setSettings] = useState<AppSettings>({ instagram_enabled: true });
  const [instagramPosts, setInstagramPosts] = useState<InstagramPost[]>([]);

  const [editingService, setEditingService] = useState<any>(null);
  const [editingMember, setEditingMember] = useState<any>(null);
  const [editingProfile, setEditingProfile] = useState<any>(null);
  const [viewingHistory, setViewingHistory] = useState<User | null>(null);
  const [newOffDate, setNewOffDate] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [instaTokenInput, setInstaTokenInput] = useState('');

  // Per la scheda tecnica
  const [newTreatment, setNewTreatment] = useState<TreatmentRecord>({ date: new Date().toISOString().split('T')[0], service: '', notes: '' });

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
          avatar: metadata.avatar_url || '',
          treatment_history: []
        });
      }

      setUser({
        id: supabaseUser.id,
        email: supabaseUser.email!,
        fullName: profile?.full_name || 'Utente',
        phone: profile?.phone || '',
        role: profile?.role || 'client',
        avatar: profile?.avatar || '',
        treatment_history: profile?.treatment_history || []
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
      const [appts, svcs, tm, appSettings] = await Promise.all([
        db.appointments.getAll(),
        db.services.getAll(),
        db.team.getAll(),
        db.settings.get()
      ]);
      
      setAppointments(appts);
      setSettings(appSettings);
      setInstaTokenInput(appSettings.instagram_access_token || '');
      
      if (svcs && svcs.length > 0) setServices(svcs);
      if (tm && tm.length > 0) setTeam(tm);

      if (user?.role === 'admin') {
        const prfs = await db.profiles.getAll();
        setProfiles(prfs);
        if (activeTab === 'dashboard') setActiveTab('admin_dashboard');
      }

      // Sincronizzazione automatica foto Instagram se abilitato e token presente
      if (appSettings.instagram_enabled && appSettings.instagram_access_token) {
        const posts = await fetchInstagramPhotos(appSettings.instagram_access_token);
        setInstagramPosts(posts);
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
      setUser({ ...user, ...editingProfile } as any);
    }
    setEditingProfile(null);
    refreshData();
  };

  const addTreatment = async () => {
    if (!viewingHistory || !newTreatment.service) return;
    const updatedHistory = [...(viewingHistory.treatment_history || []), newTreatment];
    const updatedProfile = { ...viewingHistory, treatment_history: updatedHistory };
    await db.profiles.upsert(updatedProfile);
    setViewingHistory(updatedProfile as any);
    setNewTreatment({ date: new Date().toISOString().split('T')[0], service: '', notes: '' });
    refreshData();
  };

  const updateInstagramSettings = async () => {
    const newSettings = { ...settings, instagram_access_token: instaTokenInput };
    await db.settings.update(newSettings);
    setSettings(newSettings);
    alert('Impostazioni Instagram salvate!');
    refreshData();
  };

  const toggleInstagram = async () => {
    const newSettings = { ...settings, instagram_enabled: !settings.instagram_enabled };
    await db.settings.update(newSettings);
    setSettings(newSettings);
    if (newSettings.instagram_enabled && newSettings.instagram_access_token) {
       const posts = await fetchInstagramPhotos(newSettings.instagram_access_token);
       setInstagramPosts(posts);
    }
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

  const toggleMemberForService = (memberName: string) => {
    const current = editingService.assigned_team_members || [];
    if (current.includes(memberName)) {
      setEditingService({
        ...editingService,
        assigned_team_members: current.filter((m: string) => m !== memberName)
      });
    } else {
      setEditingService({
        ...editingService,
        assigned_team_members: [...current, memberName]
      });
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  const filteredServices = filterCategory === 'Tutti' ? services : services.filter(s => s.category === filterCategory);
  const categories = ['Tutti', ...Array.from(new Set(services.map(s => s.category)))];

  const instagramMocks = [
    'https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=300&h=300&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1562322140-8baeececf3df?q=80&w=300&h=300&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?q=80&w=300&h=300&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1620331311520-246422fd82f9?q=80&w=300&h=300&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1522337660859-02fbefca4702?q=80&w=300&h=300&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?q=80&w=300&h=300&auto=format&fit=crop'
  ];

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
        <div className="space-y-12 animate-in fade-in duration-500 pb-20">
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              {user && (
                <button onClick={() => setEditingProfile(user)} className="relative group">
                  <img src={user.avatar || `https://ui-avatars.com/api/?name=${user.fullName}`} className="w-16 h-16 rounded-full object-cover border-2 border-amber-500 shadow-lg" />
                  <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><i className="fas fa-camera text-white text-xs"></i></div>
                </button>
              )}
              <div>
                <h2 className="text-4xl font-luxury font-bold leading-tight">{user ? `Ciao, ${user.fullName.split(' ')[0]}!` : "Benvenuti da Kristal"}<br/><span className="text-amber-500">Luxury Beauty Salon</span></h2>
              </div>
            </div>
            <button onClick={() => { if(!user) setIsAuthOpen(true); else setIsFormOpen(true); }} className="bg-black text-white px-8 py-5 rounded-2xl font-bold shadow-2xl hover:scale-105 transition-all">Prenota Ora</button>
          </header>

          {/* INSTAGRAM GALLERY SECTION */}
          {settings.instagram_enabled && (
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-luxury font-bold">I nostri Capolavori</h3>
                  <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">Sincronizzato con Instagram @salonekristal</p>
                </div>
                <a href="https://www.instagram.com/salonekristal/?hl=it" target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-amber-600 hover:underline flex items-center gap-2">
                  <i className="fab fa-instagram"></i> SEGUICI
                </a>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {instagramPosts.length > 0 ? (
                  instagramPosts.map((post) => (
                    <a 
                      key={post.id} 
                      href={post.permalink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="aspect-square rounded-2xl overflow-hidden group relative shadow-md"
                    >
                      <img 
                        src={post.media_type === 'VIDEO' ? post.thumbnail_url : post.media_url} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                        alt="Instagram Kristal"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <i className="fab fa-instagram text-white text-3xl"></i>
                      </div>
                    </a>
                  ))
                ) : (
                  // Fallback Mocks se non c'è il token o errore
                  instagramMocks.map((img, i) => (
                    <div key={i} className="aspect-square rounded-2xl overflow-hidden group relative shadow-md">
                      <img src={img} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                      <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                         <i className="fab fa-instagram text-white/50 text-xl"></i>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {!settings.instagram_access_token && user?.role === 'admin' && (
                <p className="text-[10px] text-amber-600 bg-amber-50 p-3 rounded-xl font-bold uppercase">
                  <i className="fas fa-info-circle mr-2"></i> Admin: Inserisci un Access Token nel pannello statistiche per sincronizzare i post reali.
                </p>
              )}
            </section>
          )}

          <div className="space-y-6">
            <h3 className="text-2xl font-luxury font-bold">I Nostri Trattamenti</h3>
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
        </div>
      )}

      {/* ADMIN DASHBOARD */}
      {activeTab === 'admin_dashboard' && user?.role === 'admin' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <header className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-luxury font-bold">Pannello Kristal</h2>
              <p className="text-gray-500 text-sm">Gestionale & Integrazioni Social.</p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={toggleInstagram} 
                className={`px-6 py-3 rounded-xl font-bold text-xs transition-all ${settings.instagram_enabled ? 'bg-green-100 text-green-700 shadow-md' : 'bg-gray-100 text-gray-400'}`}
              >
                <i className={`fab fa-instagram mr-2`}></i> {settings.instagram_enabled ? 'Gallery Attiva' : 'Gallery Off'}
              </button>
              <button onClick={() => setIsFormOpen(true)} className="bg-amber-500 text-white px-6 py-3 rounded-xl font-bold text-xs shadow-lg shadow-amber-200">
                <i className="fas fa-plus mr-2"></i> Appuntamento
              </button>
            </div>
          </header>

          {/* Configurazione Instagram */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-4">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Sincronizzazione Instagram</h4>
            <p className="text-xs text-gray-500 leading-relaxed">Inserisci il <strong>Instagram Basic Display Access Token</strong> per mostrare automaticamente i post del salone nella pagina principale.</p>
            <div className="flex flex-col md:flex-row gap-3">
              <input 
                type="password"
                placeholder="Inserisci Instagram Access Token..."
                className="flex-1 p-4 bg-gray-50 rounded-2xl text-xs font-mono outline-none focus:ring-2 focus:ring-amber-400 transition-all"
                value={instaTokenInput}
                onChange={(e) => setInstaTokenInput(e.target.value)}
              />
              <button 
                onClick={updateInstagramSettings}
                className="bg-black text-white px-8 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest hover:scale-105 transition-all shadow-lg"
              >
                Salva Token
              </button>
            </div>
            <p className="text-[10px] text-gray-400">
              <i className="fas fa-lightbulb mr-1"></i> Suggerimento: Puoi ottenere il token tramite Meta for Developers (Basic Display API).
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
             <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Appuntamenti</p>
                <h3 className="text-2xl font-bold">{appointments.length}</h3>
              </div>
              <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Clienti</p>
                <h3 className="text-2xl font-bold">{profiles.length}</h3>
              </div>
              <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Servizi</p>
                <h3 className="text-2xl font-bold">{services.length}</h3>
              </div>
              <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Staff Attivo</p>
                <h3 className="text-2xl font-bold">{team.length}</h3>
              </div>
          </div>
        </div>
      )}

      {/* ADMIN: LISTA CLIENTI & SCHEDA TECNICA */}
      {activeTab === 'calendar' && user?.role === 'admin' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <section className="space-y-6">
            <h2 className="text-3xl font-luxury font-bold">Appuntamenti</h2>
            <div className="grid gap-4">
              {appointments.map(app => (
                <div key={app.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex gap-4 items-center">
                    <div className="bg-amber-50 p-4 rounded-2xl text-center min-w-[70px]">
                      <p className="text-[10px] font-bold text-amber-600 uppercase">{new Date(app.date).toLocaleDateString('it-IT', { month: 'short' })}</p>
                      <p className="text-xl font-bold text-gray-900">{new Date(app.date).getDate()}</p>
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">{app.services?.name}</h4>
                      <p className="text-xs text-gray-400 font-bold uppercase">Con {app.team_member_name} per {app.profiles?.full_name}</p>
                      <p className="text-xs text-amber-600 font-bold mt-1 uppercase tracking-widest">{new Date(app.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setViewingHistory(profiles.find(p => p.id === app.client_id))} className="w-10 h-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center"><i className="fas fa-file-medical text-xs"></i></button>
                    <button onClick={() => { setSelectedAppointment(app); setIsFormOpen(true); }} className="w-10 h-10 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center"><i className="fas fa-edit text-xs"></i></button>
                    <button onClick={async () => { if(confirm('Eliminare?')) { await db.appointments.delete(app.id); refreshData(); }}} className="w-10 h-10 rounded-full bg-red-50 text-red-400 flex items-center justify-center"><i className="fas fa-trash text-xs"></i></button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-6">
            <h3 className="text-2xl font-luxury font-bold">Archivio Clienti</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {profiles.map(p => (
                <div key={p.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 flex items-center justify-between hover:border-amber-200 transition-all">
                  <div className="flex items-center gap-4">
                    <img src={p.avatar || `https://ui-avatars.com/api/?name=${p.full_name}`} className="w-12 h-12 rounded-full object-cover border border-gray-100 shadow-sm" />
                    <div>
                      <h5 className="font-bold text-sm">{p.full_name}</h5>
                      <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">{p.phone || 'Privato'}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setViewingHistory(p)} className="p-3 bg-blue-50 text-blue-500 rounded-xl hover:bg-blue-500 hover:text-white transition-all" title="Scheda Tecnica"><i className="fas fa-notes-medical"></i></button>
                    <button onClick={() => setEditingProfile(p)} className="p-3 bg-gray-50 text-gray-400 rounded-xl hover:text-amber-500 transition-all"><i className="fas fa-user-edit"></i></button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* SCHEDA TECNICA MODALE (RISERVATA ADMIN) */}
      {viewingHistory && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[500] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] p-10 shadow-2xl overflow-y-auto max-h-[90vh] space-y-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <img src={viewingHistory.avatar || `https://ui-avatars.com/api/?name=${viewingHistory.fullName}`} className="w-14 h-14 rounded-full border-2 border-amber-500 shadow-md" />
                <div>
                  <h3 className="text-2xl font-luxury font-bold">Scheda Tecnica</h3>
                  <p className="text-gray-400 text-xs font-bold uppercase">{viewingHistory.fullName}</p>
                </div>
              </div>
              <button onClick={() => setViewingHistory(null)} className="w-10 h-10 rounded-full bg-gray-50 text-gray-400 hover:text-gray-900 transition-all flex items-center justify-center"><i className="fas fa-times"></i></button>
            </div>

            <div className="space-y-6">
              <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100">
                <h4 className="text-xs font-bold text-amber-700 uppercase tracking-widest mb-4">Aggiungi Nuovo Trattamento</h4>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <input type="date" className="p-4 rounded-xl bg-white border-none text-xs font-bold" value={newTreatment.date} onChange={e => setNewTreatment({...newTreatment, date: e.target.value})} />
                    <input placeholder="Servizio effettuato" className="p-4 rounded-xl bg-white border-none text-xs font-bold" value={newTreatment.service} onChange={e => setNewTreatment({...newTreatment, service: e.target.value})} />
                  </div>
                  <textarea placeholder="Note tecniche (colore usato, tempi di posa, reazioni...)" className="w-full p-4 rounded-xl bg-white border-none text-xs h-24" value={newTreatment.notes} onChange={e => setNewTreatment({...newTreatment, notes: e.target.value})} />
                  <button onClick={addTreatment} className="w-full py-4 bg-amber-500 text-white rounded-xl font-bold uppercase text-[10px] shadow-lg shadow-amber-200">Registra Trattamento</button>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Cronologia Trattamenti</h4>
                {(!viewingHistory.treatment_history || viewingHistory.treatment_history.length === 0) ? (
                  <p className="text-sm text-gray-300 italic">Nessun trattamento registrato.</p>
                ) : (
                  [...(viewingHistory.treatment_history || [])].reverse().map((record, i) => (
                    <div key={i} className="bg-white p-6 border-l-4 border-amber-500 shadow-sm rounded-r-3xl">
                      <div className="flex justify-between items-start mb-2">
                        <h5 className="font-bold text-gray-900">{record.service}</h5>
                        <span className="text-[10px] font-bold text-gray-400">{new Date(record.date).toLocaleDateString()}</span>
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed">{record.notes}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Altre modali esistenti (TEAM, SERVIZI, PROFILO, PRENOTAZIONE) */}
      
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
                    <div><h4 className="font-bold text-xl">{m.name}</h4><p className="text-xs text-gray-400 uppercase font-bold tracking-widest">{m.role}</p><p className="text-[10px] font-bold text-amber-600 mt-1 uppercase">Orario: {m.start_hour ?? 8}:00 - {m.end_hour ?? 18}:00</p></div>
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
                  <div className="flex gap-2"><input type="date" className="flex-1 bg-gray-50 border-none rounded-xl p-3 text-[10px] font-bold" onChange={(e) => setNewOffDate(e.target.value)} /><button onClick={() => addOffDate(m.name)} className="bg-amber-100 text-amber-600 px-4 py-2 rounded-xl text-[10px] font-bold uppercase">Blocca</button></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'services' && user?.role === 'admin' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="flex justify-between items-center"><h2 className="text-3xl font-luxury font-bold">Listino Servizi</h2><button onClick={() => setEditingService({ name: '', price: 0, duration: 30, category: 'Capelli', description: '', assigned_team_members: [] })} className="bg-gray-900 text-white px-6 py-3 rounded-xl font-bold text-xs">Nuovo Servizio</button></div>
          <div className="grid gap-3">
            {services.map(s => (
              <div key={s.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 flex justify-between items-center shadow-sm">
                <div className="flex-1"><h4 className="font-bold text-lg">{s.name}</h4><div className="flex gap-2 mt-1"><span className="text-[10px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-bold uppercase">{s.category}</span><span className="text-[10px] text-gray-400 font-bold uppercase">CHF {s.price} • {s.duration} min</span></div></div>
                <div className="flex gap-1"><button onClick={() => setEditingService(s)} className="p-3 text-amber-600 hover:bg-amber-50 rounded-full"><i className="fas fa-edit"></i></button><button onClick={async () => { if(confirm('Eliminare?')) { await db.services.delete(s.id); refreshData(); }}} className="p-3 text-red-400 hover:bg-red-50 rounded-full"><i className="fas fa-trash"></i></button></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODALS PERSISTENZA */}
      {editingService && (
        <div className="fixed inset-0 bg-black/60 z-[400] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-[3rem] p-10 overflow-y-auto max-h-[90vh]">
            <h3 className="text-2xl font-luxury font-bold mb-6">Gestione Servizio</h3>
            <form onSubmit={saveService} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block">Nome</label><input placeholder="Es. Taglio Luxury" className="w-full p-4 bg-gray-50 rounded-2xl" value={editingService.name} onChange={e => setEditingService({...editingService, name: e.target.value})} required /></div>
                <div><label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block">Prezzo (CHF)</label><input type="number" className="w-full p-4 bg-gray-50 rounded-2xl" value={editingService.price} onChange={e => setEditingService({...editingService, price: Number(e.target.value)})} required /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block">Durata (Min)</label><input type="number" className="w-full p-4 bg-gray-50 rounded-2xl" value={editingService.duration} onChange={e => setEditingService({...editingService, duration: Number(e.target.value)})} required /></div>
                <div><label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block">Categoria</label><select className="w-full p-4 bg-gray-50 rounded-2xl font-bold" value={editingService.category} onChange={e => setEditingService({...editingService, category: e.target.value})}><option>Donna</option><option>Uomo</option><option>Colore</option><option>Trattamenti</option><option>Estetica</option></select></div>
              </div>
              <div><label className="text-[10px] font-bold text-gray-400 uppercase mb-3 block">Assegna Staff</label>
                <div className="flex flex-wrap gap-2">{team.map(m => (<button key={m.name} type="button" onClick={() => toggleMemberForService(m.name)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border-2 ${(editingService.assigned_team_members || []).includes(m.name) ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-gray-500 border-gray-100 hover:border-amber-200'}`}>{m.name}</button>))}<button type="button" onClick={() => setEditingService({...editingService, assigned_team_members: []})} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border-2 ${(!editingService.assigned_team_members || editingService.assigned_team_members.length === 0) ? 'bg-green-500 text-white border-green-500' : 'bg-white text-gray-500 border-gray-100'}`}>Tutti</button></div>
              </div>
              <div className="flex gap-4 pt-6"><button type="button" onClick={() => setEditingService(null)} className="flex-1 py-4 text-gray-400 font-bold uppercase text-[10px]">Annulla</button><button type="submit" className="flex-1 py-4 bg-black text-white rounded-2xl font-bold uppercase text-[10px]">Salva</button></div>
            </form>
          </div>
        </div>
      )}

      {editingMember && (
        <div className="fixed inset-0 bg-black/60 z-[400] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl"><h3 className="text-2xl font-luxury font-bold mb-6">Staff: {editingMember.name || 'Nuovo'}</h3>
            <form onSubmit={saveMember} className="space-y-4">
              <input placeholder="Nome" className="w-full p-4 bg-gray-50 rounded-2xl" value={editingMember.name} onChange={e => setEditingMember({...editingMember, name: e.target.value})} required />
              <input placeholder="Ruolo" className="w-full p-4 bg-gray-50 rounded-2xl" value={editingMember.role} onChange={e => setEditingMember({...editingMember, role: e.target.value})} required />
              <input placeholder="URL Foto" className="w-full p-4 bg-gray-50 rounded-2xl" value={editingMember.avatar} onChange={e => setEditingMember({...editingMember, avatar: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block">Inizio</label><input type="number" className="w-full p-4 bg-gray-50 rounded-2xl" value={editingMember.start_hour} onChange={e => setEditingMember({...editingMember, start_hour: Number(e.target.value)})} /></div>
                <div><label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block">Fine</label><input type="number" className="w-full p-4 bg-gray-50 rounded-2xl" value={editingMember.end_hour} onChange={e => setEditingMember({...editingMember, end_hour: Number(e.target.value)})} /></div>
              </div>
              <div className="flex gap-4 pt-4"><button type="button" onClick={() => setEditingMember(null)} className="flex-1 py-4 text-gray-400 font-bold uppercase text-[10px]">Annulla</button><button type="submit" className="flex-1 py-4 bg-black text-white rounded-2xl font-bold uppercase text-[10px]">Salva</button></div>
            </form>
          </div>
        </div>
      )}

      {editingProfile && (
        <div className="fixed inset-0 bg-black/60 z-[400] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl"><h3 className="text-2xl font-luxury font-bold mb-6">Profilo Utente</h3>
            <form onSubmit={saveProfile} className="space-y-4">
              <input placeholder="Nome Completo" className="w-full p-4 bg-gray-50 rounded-2xl" value={editingProfile.full_name} onChange={e => setEditingProfile({...editingProfile, full_name: e.target.value})} required />
              <input placeholder="Telefono" className="w-full p-4 bg-gray-50 rounded-2xl" value={editingProfile.phone} onChange={e => setEditingProfile({...editingProfile, phone: e.target.value})} />
              <input placeholder="URL Foto Profilo" className="w-full p-4 bg-gray-50 rounded-2xl" value={editingProfile.avatar} onChange={e => setEditingProfile({...editingProfile, avatar: e.target.value})} />
              <div className="flex gap-4 pt-4"><button type="button" onClick={() => setEditingProfile(null)} className="flex-1 py-4 text-gray-400 font-bold uppercase text-[10px]">Annulla</button><button type="submit" className="flex-1 py-4 bg-amber-500 text-white rounded-2xl font-bold uppercase text-[10px]">Salva</button></div>
            </form>
          </div>
        </div>
      )}

      {isFormOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-[3rem] p-10 shadow-2xl overflow-y-auto max-h-[95vh]"><h3 className="text-2xl font-luxury font-bold mb-8">Prenotazione</h3>
            <AppointmentForm services={services} team={team} existingAppointments={appointments} onSave={saveAppointment} onCancel={() => setIsFormOpen(false)} initialData={selectedAppointment} isAdmin={user?.role === 'admin'} profiles={profiles} />
          </div>
        </div>
      )}

      <AIAssistant />
    </Layout>
  );
};

export default App;
