
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
  const [isAddingGuest, setIsAddingGuest] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [viewingGuest, setViewingGuest] = useState<any | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<any | undefined>();
  const [clientSearch, setClientSearch] = useState('');
  const [newSheet, setNewSheet] = useState({ category: 'Colore', content: '' });

  const isAdmin = user?.role === 'admin';

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
              email: session.user.email!,
              fullName: profile.full_name || 'Ospite',
              phone: profile.phone || '',
              role: profile.role || 'client'
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
            email: session.user.email!,
            fullName: profile.full_name || 'Ospite',
            phone: profile.phone || '',
            role: profile.role || 'client'
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
      const [s, t, a, p] = await Promise.all([
        db.services.getAll(),
        db.team.getAll(),
        db.appointments.getAll(),
        db.profiles.getAll()
      ]);
      if (s.length) setServices(s);
      if (t.length) setTeam(t);
      setAppointments(a);
      setProfiles(p);
    } catch (e) {
      console.error("Fetch data error", e);
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
      const updatedProfile = { ...p, role: newRole };
      await db.profiles.upsert(updatedProfile);
      await refreshData();
      if (viewingGuest && viewingGuest.id === profileId) setViewingGuest(updatedProfile);
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
      <div className="w-12 h-12 border-4 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <Layout user={user} onLogout={handleLogout} onLoginClick={() => setIsAuthOpen(true)} activeTab={activeTab} setActiveTab={setActiveTab}>
      
      {/* DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="space-y-12 animate-in fade-in duration-700">
          <header className="flex justify-between items-end">
            <div>
              <p className="text-amber-600 text-[10px] font-bold uppercase tracking-[0.3em] mb-2">{timeGreeting}</p>
              <h2 className="text-5xl font-luxury font-bold text-gray-900 tracking-tighter">
                {user ? user.fullName.split(' ')[0] : 'Benvenuti'}
              </h2>
            </div>
          </header>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="col-span-2 bg-white p-10 rounded-[3rem] border border-gray-50 shadow-sm">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-8">Ritual d'Eccellenza</h3>
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
            <div className="bg-black text-white p-10 rounded-[3.5rem] shadow-2xl flex flex-col justify-between">
              <div>
                <h3 className="text-xl font-luxury font-bold mb-4">L'Atelier</h3>
                <p className="text-[11px] leading-relaxed text-gray-400 italic">"Un rifugio di lusso dedicato alla cura del sé."</p>
              </div>
              <button onClick={() => user ? setIsFormOpen(true) : setIsAuthOpen(true)} className="w-full py-4 bg-white text-black rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-amber-600 hover:text-white transition-all">Riserva un Momento</button>
            </div>
          </div>
        </div>
      )}

      {/* OSPITI (CRM) */}
      {activeTab === 'clients' && isAdmin && (
        <div className="space-y-8 animate-in fade-in">
          <div className="flex justify-between items-center">
            <h2 className="text-4xl font-luxury font-bold">I Nostri Ospiti</h2>
            <div className="flex gap-4">
              <input type="text" placeholder="Ricerca..." className="px-6 py-3 bg-white border border-gray-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-amber-500" value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} />
              <button onClick={() => setIsAddingGuest(true)} className="px-6 py-3 bg-black text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest">Nuovo Ospite</button>
            </div>
          </div>
          <div className="grid gap-4">
            {profiles.filter(p => (p.full_name || '').toLowerCase().includes(clientSearch.toLowerCase())).map(p => (
              <div key={p.id} className="bg-white p-6 rounded-[2.5rem] border border-gray-50 flex items-center justify-between hover:shadow-md transition-all">
                <div className="flex items-center gap-4">
                  <img src={p.avatar || `https://ui-avatars.com/api/?name=${p.full_name || 'U'}`} className="w-12 h-12 rounded-full" />
                  <div>
                    <h5 className="font-bold text-lg">{p.full_name || 'Ospite Kristal'}</h5>
                    <p className="text-[10px] text-gray-400 uppercase font-bold">{p.email} | {p.phone || 'No tel'}</p>
                  </div>
                </div>
                <button onClick={() => setViewingGuest(p)} className="px-6 py-3 bg-gray-50 rounded-xl text-[9px] font-bold uppercase hover:bg-black hover:text-white transition-all">Dettagli CRM</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TEAM & PLANNING */}
      {activeTab === 'team_schedule' && isAdmin && (
        <div className="space-y-12 animate-in fade-in">
          <h2 className="text-4xl font-luxury font-bold">Il Team & Planning</h2>
          <TeamPlanning team={team} appointments={appointments} onToggleVacation={handleToggleVacation} />
          <div className="grid md:grid-cols-3 gap-6">
            {team.map(m => (
              <div key={m.name} className="bg-white p-8 rounded-[3rem] border border-gray-50 text-center">
                <img src={m.avatar || `https://ui-avatars.com/api/?name=${m.name}`} className="w-24 h-24 rounded-full mx-auto mb-4 object-cover" />
                <h4 className="text-xl font-luxury font-bold">{m.name}</h4>
                <p className="text-[9px] text-amber-600 font-bold uppercase mb-6">{m.role}</p>
                <button onClick={() => setEditingMember(m)} className="w-full py-3 bg-gray-50 rounded-xl text-[9px] font-bold uppercase hover:bg-black hover:text-white transition-all">Gestisci</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SERVIZI */}
      {activeTab === 'services_management' && isAdmin && (
        <div className="space-y-8 animate-in fade-in">
          <div className="flex justify-between items-center">
            <h2 className="text-4xl font-luxury font-bold">Gestione Ritual</h2>
            <button onClick={() => setIsServiceFormOpen(true)} className="px-8 py-4 bg-black text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest">Crea Nuovo Ritual</button>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {services.map(s => (
              <div key={s.id} className="bg-white p-8 rounded-[2.5rem] border border-gray-50 flex justify-between items-center">
                <div>
                  <p className="text-[9px] font-bold text-amber-600 uppercase mb-1">{s.category}</p>
                  <h4 className="font-bold text-lg">{s.name}</h4>
                  <p className="text-xs text-gray-400">CHF {s.price} | {s.duration} min</p>
                </div>
                <button onClick={async () => { if(confirm('Eliminare?')) { await db.services.delete(s.id); refreshData(); } }} className="text-gray-300 hover:text-red-500"><i className="fas fa-trash"></i></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODALI */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[500] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] p-10 shadow-2xl overflow-y-auto max-h-[90vh]">
             <AppointmentForm services={services} team={team} existingAppointments={appointments} onSave={async (a) => { await db.appointments.upsert({ ...a, client_id: isAdmin ? a.client_id : user?.id }); setIsFormOpen(false); refreshData(); }} onCancel={() => setIsFormOpen(false)} isAdmin={isAdmin} profiles={profiles} initialData={selectedAppointment} />
          </div>
        </div>
      )}

      {viewingGuest && (
        <div className="fixed inset-0 bg-white/95 backdrop-blur-2xl z-[800] overflow-y-auto p-6 flex items-center justify-center">
           <div className="w-full max-w-5xl bg-white rounded-[4rem] shadow-2xl p-12 border border-gray-100 relative max-h-[90vh] flex flex-col">
              <button onClick={() => setViewingGuest(null)} className="absolute top-10 right-10 text-gray-300 hover:text-black"><i className="fas fa-times text-xl"></i></button>
              <div className="flex items-center gap-10 mb-12 border-b pb-10">
                 <img src={viewingGuest.avatar || `https://ui-avatars.com/api/?name=${viewingGuest.full_name}`} className="w-32 h-32 rounded-full shadow-xl" />
                 <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                       <h3 className="text-4xl font-luxury font-bold">{viewingGuest.full_name}</h3>
                       <select value={viewingGuest.role} onChange={(e) => handleUpdateRole(viewingGuest.id, e.target.value)} className="bg-gray-50 border-none text-[9px] font-bold uppercase px-3 py-1 rounded-lg">
                          <option value="client">Ospite</option>
                          <option value="collaborator">Artista</option>
                          <option value="admin">Direzione</option>
                       </select>
                    </div>
                    <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">{viewingGuest.email} | {viewingGuest.phone}</p>
                 </div>
              </div>
              <div className="flex-1 overflow-y-auto grid md:grid-cols-2 gap-12 pr-4 scrollbar-hide">
                 <div className="space-y-8">
                    <h4 className="text-xl font-luxury font-bold border-l-4 border-amber-600 pl-4">Schede Tecniche</h4>
                    <textarea placeholder="Inserisci formula colore..." className="w-full p-6 rounded-3xl bg-gray-50 border-none text-xs" rows={4} value={newSheet.content} onChange={(e) => setNewSheet({...newSheet, content: e.target.value})} />
                    <button onClick={handleAddTechnicalSheet} className="w-full py-4 bg-black text-white rounded-2xl text-[9px] font-bold uppercase tracking-widest">Salva Scheda</button>
                    <div className="space-y-4">
                       {(viewingGuest.technical_sheets || []).map((s: any) => (
                         <div key={s.id} className="p-6 bg-white border rounded-3xl">
                            <p className="text-[9px] text-gray-300 font-bold mb-2">{new Date(s.date).toLocaleDateString()}</p>
                            <p className="text-[11px] text-gray-700 whitespace-pre-wrap">{s.content}</p>
                         </div>
                       ))}
                    </div>
                 </div>
                 <div className="space-y-8">
                    <h4 className="text-xl font-luxury font-bold border-l-4 border-gray-900 pl-4">Storico Appuntamenti</h4>
                    <div className="space-y-4">
                       {appointments.filter(a => a.client_id === viewingGuest.id).sort((a,b) => b.date.localeCompare(a.date)).map(app => (
                         <div key={app.id} className="flex items-center justify-between p-6 bg-white border rounded-3xl group">
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[500] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-[3rem] p-10 shadow-2xl">
            <ServiceForm onSave={async (s) => { await db.services.upsert(s); setIsServiceFormOpen(false); refreshData(); }} onCancel={() => setIsServiceFormOpen(false)} />
          </div>
        </div>
      )}

      {editingMember && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[500] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-[3rem] p-10 shadow-2xl overflow-y-auto max-h-[90vh]">
            <TeamManagement member={editingMember} appointments={appointments} services={services} onSave={async (m) => { await db.team.upsert(m); refreshData(); setEditingMember(null); }} onClose={() => setEditingMember(null)} />
          </div>
        </div>
      )}

      <AIAssistant user={user} />
    </Layout>
  );
};

export default App;
