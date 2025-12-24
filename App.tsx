
import React, { useState, useEffect, useMemo } from 'react';
import Layout from './components/Layout';
import Auth from './components/Auth';
import AIAssistant from './components/AIAssistant';
import AppointmentForm from './components/AppointmentForm';
import { supabase, db } from './services/supabase';
import { Service, User, TeamMember, Appointment } from './types';
import { SERVICES as DEFAULT_SERVICES, TEAM as DEFAULT_TEAM } from './constants';

// Fix: Complete the App component to resolve the 'void' return type error and missing default export
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
    // Fix: Completed initAuth function and correctly handled async logic to fix line 54 error
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
  }, []);

  useEffect(() => {
    const fetchData = async () => {
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
    if (!loading) fetchData();
  }, [loading, user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setActiveTab('dashboard');
  };

  const handleSaveAppointment = async (apptData: Partial<Appointment>) => {
    try {
      const payload = {
        ...apptData,
        id: selectedAppointment?.id || Math.random().toString(36).substr(2, 9),
        client_id: apptData.client_id || user?.id,
        status: 'confirmed'
      };
      await db.appointments.upsert(payload);
      const updated = await db.appointments.getAll();
      setAppointments(updated);
      setIsFormOpen(false);
      setSelectedAppointment(undefined);
    } catch (e) {
      console.error("Save appointment error", e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#fcfcfc]">
        <h1 className="text-4xl font-luxury font-bold tracking-tighter text-gray-900 mb-8">KRISTAL</h1>
        <div className="flex space-x-2">
          <div className="w-1.5 h-1.5 bg-amber-600 rounded-full animate-bounce"></div>
          <div className="w-1.5 h-1.5 bg-amber-600 rounded-full animate-bounce [animation-delay:-0.2s]"></div>
          <div className="w-1.5 h-1.5 bg-amber-600 rounded-full animate-bounce [animation-delay:-0.4s]"></div>
        </div>
      </div>
    );
  }

  return (
    <Layout 
      user={user} 
      onLogout={handleLogout} 
      onLoginClick={() => setIsAuthOpen(true)}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
    >
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
            <div className="col-span-2 bg-white p-10 rounded-[3rem] border border-gray-50 shadow-sm overflow-hidden">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-8">I Nostri Ritual d'Eccellenza</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {services.slice(0, 6).map(s => (
                  <div key={s.id} className="p-6 bg-gray-50 rounded-[2rem] hover:bg-amber-50 transition-all cursor-default">
                    <p className="text-[8px] font-bold text-amber-600 uppercase tracking-widest mb-1">{s.category}</p>
                    <h4 className="font-bold text-sm mb-1">{s.name}</h4>
                    <p className="text-[10px] text-gray-400 mb-4">{s.duration} min</p>
                    <p className="text-xs font-luxury font-bold text-gray-900">CHF {s.price}</p>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="space-y-8">
              <div className="bg-black text-white p-10 rounded-[3.5rem] shadow-2xl relative overflow-hidden group">
                <i className="fas fa-spa absolute -bottom-10 -right-10 text-9xl text-white/5 transition-transform group-hover:scale-110"></i>
                <h3 className="text-xl font-luxury font-bold mb-4 relative z-10">L'Atelier</h3>
                <p className="text-[11px] leading-relaxed text-gray-400 mb-10 relative z-10 italic">
                  "Un rifugio di lusso dedicato alla cura del sé, dove ogni dettaglio è un'opera d'arte."
                </p>
                <button 
                  onClick={() => user ? setIsFormOpen(true) : setIsAuthOpen(true)}
                  className="w-full py-4 bg-white text-black rounded-2xl text-[10px] font-bold uppercase tracking-widest relative z-10 hover:bg-amber-600 hover:text-white transition-all shadow-lg"
                >
                  Riserva un Momento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isFormOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[500] flex items-center justify-center p-4 animate-in fade-in duration-500">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] p-10 shadow-2xl overflow-y-auto max-h-[90vh]">
             <div className="text-center mb-10">
                <h2 className="text-3xl font-luxury font-bold">Riserva il Tuo Tempo</h2>
                <p className="text-amber-600 text-[10px] font-bold uppercase tracking-widest mt-2">Personalizza il tuo rituale</p>
             </div>
             <AppointmentForm 
               services={services} 
               team={team} 
               existingAppointments={appointments} 
               onSave={handleSaveAppointment} 
               onCancel={() => setIsFormOpen(false)}
               isAdmin={isAdmin}
               profiles={profiles}
               initialData={selectedAppointment}
             />
          </div>
        </div>
      )}

      {isAuthOpen && !user && (
        <div className="fixed inset-0 z-[1000] bg-[#fcfcfc] overflow-y-auto animate-in slide-in-from-bottom duration-700">
          <button onClick={() => setIsAuthOpen(false)} className="absolute top-10 right-10 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center z-10 hover:rotate-90 transition-all duration-500">
            <i className="fas fa-times text-gray-400"></i>
          </button>
          <Auth onLogin={(u) => { setUser(u); setIsAuthOpen(false); }} />
        </div>
      )}

      <AIAssistant user={user} />
    </Layout>
  );
};

// Fix: Added default export for App component to resolve index.tsx error
export default App;
