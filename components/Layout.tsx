
import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  user: any;
  onLogout: () => void;
  onLoginClick?: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, user, onLogout, onLoginClick, activeTab, setActiveTab }) => {
  const isAdmin = user?.role === 'admin';
  const isCollaborator = user?.role === 'collaborator';
  const isGuest = !user;

  const guestNav = [
    { id: 'dashboard', label: "L'Atelier", icon: 'fa-spa' },
  ];

  const clientNav = [
    { id: 'dashboard', label: 'Prenota', icon: 'fa-calendar-plus' },
    { id: 'calendar', label: 'Miei Appuntamenti', icon: 'fa-history' },
  ];

  const collaboratorNav = [
    { id: 'dashboard', label: 'Agenda', icon: 'fa-user-clock' },
    { id: 'team_schedule', label: 'Planning', icon: 'fa-calendar-alt' },
  ];

  const adminNav = [
    { id: 'dashboard', label: 'Visione', icon: 'fa-chart-pie' },
    { id: 'services_management', label: 'Servizi', icon: 'fa-concierge-bell' },
    { id: 'team_schedule', label: 'Team', icon: 'fa-users' },
    { id: 'clients', label: 'Ospiti', icon: 'fa-heart' },
  ];

  let navItems = guestNav;
  if (isAdmin) navItems = adminNav;
  else if (isCollaborator) navItems = collaboratorNav;
  else if (user) navItems = clientNav;

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#fcfcfc]">
      {/* SIDEBAR DESKTOP */}
      <aside className="hidden md:flex flex-col w-72 bg-white border-r border-gray-50 sticky top-0 h-screen z-40">
        <div className="p-12">
          <h1 className="text-3xl font-luxury font-bold text-gray-900 tracking-tighter">
            KRISTAL<span className="text-amber-600 text-[8px] font-normal uppercase block tracking-[0.4em] mt-1">Beauty Atelier</span>
          </h1>
        </div>
        
        <nav className="flex-1 px-8 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-4 px-6 py-4 rounded-2xl transition-all duration-300 ${
                activeTab === item.id 
                  ? 'bg-gray-900 text-white shadow-lg' 
                  : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <i className={`fas ${item.icon} text-sm`}></i>
              <span className="font-bold text-[10px] uppercase tracking-[0.2em]">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-8">
          {!isGuest ? (
            <div className="space-y-4">
              <div className="flex items-center space-x-3 px-2">
                <img src={user.avatar || `https://ui-avatars.com/api/?name=${user.fullName}&background=000&color=fff`} className="w-8 h-8 rounded-full" />
                <div className="overflow-hidden">
                  <p className="text-[10px] font-bold text-gray-900 truncate uppercase tracking-tighter">{user.fullName}</p>
                  <p className="text-[8px] text-amber-600 font-bold uppercase tracking-widest">
                    {isAdmin ? 'Direzione' : isCollaborator ? 'Artista' : 'Ospite'}
                  </p>
                </div>
              </div>
              <button 
                onClick={onLogout}
                className="w-full text-left px-2 text-gray-300 hover:text-red-400 transition-colors"
              >
                <span className="text-[9px] font-bold uppercase tracking-[0.3em]">Congedarsi</span>
              </button>
            </div>
          ) : (
            <button 
              onClick={onLoginClick}
              className="w-full py-4 bg-gray-900 text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-lg hover:bg-amber-600 transition-all"
            >
              Accedi
            </button>
          )}
        </div>
      </aside>

      {/* MOBILE HEADER */}
      <div className="md:hidden flex items-center justify-between p-6 bg-white border-b border-gray-50">
        <h1 className="text-xl font-luxury font-bold text-gray-900 tracking-tighter">KRISTAL</h1>
        {isGuest && (
          <button onClick={onLoginClick} className="text-[9px] font-bold uppercase tracking-widest text-amber-600 border border-amber-600 px-4 py-2 rounded-full">Accedi</button>
        )}
      </div>

      <main className="flex-1 p-6 md:p-16 overflow-y-auto pb-32 md:pb-16">
        <div className="max-w-5xl mx-auto">
          {children}
        </div>
      </main>

      {/* BOTTOM NAV MOBILE */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-gray-100 px-6 py-4 flex justify-around items-center z-50 shadow-2xl">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center space-y-1 transition-all ${
              activeTab === item.id ? 'text-gray-900' : 'text-gray-300'
            }`}
          >
            <i className={`fas ${item.icon} text-lg`}></i>
            <span className="text-[7px] font-bold uppercase tracking-widest">{item.label}</span>
          </button>
        ))}
        {!isGuest && (
          <button onClick={onLogout} className="flex flex-col items-center space-y-1 text-gray-300">
            <i className="fas fa-sign-out-alt text-lg"></i>
            <span className="text-[7px] font-bold uppercase tracking-widest">Esci</span>
          </button>
        )}
      </nav>
    </div>
  );
};

export default Layout;
