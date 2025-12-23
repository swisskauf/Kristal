
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
  const isGuest = !user;

  const guestNav = [
    { id: 'dashboard', label: 'L\'Atelier', icon: 'fa-spa' },
  ];

  const clientNav = [
    { id: 'dashboard', label: 'Riserva Tempo', icon: 'fa-calendar-plus' },
    { id: 'calendar', label: 'Il Tuo Percorso', icon: 'fa-star' },
  ];

  const adminNav = [
    { id: 'admin_dashboard', label: 'Visione', icon: 'fa-eye' },
    { id: 'team_schedule', label: 'Il Team', icon: 'fa-users' },
    { id: 'clients', label: 'I Nostri Ospiti', icon: 'fa-heart' },
    { id: 'calendar', label: 'Agenda Atelier', icon: 'fa-calendar-check' },
  ];

  const navItems = isGuest ? guestNav : (isAdmin ? adminNav : clientNav);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#fcfcfc]">
      {/* Sidebar Desktop - Luxury Dark Mode option or clean white */}
      <aside className="hidden md:flex flex-col w-80 bg-white border-r border-gray-100 shadow-sm sticky top-0 h-screen z-40">
        <div className="p-14">
          <h1 className="text-4xl font-luxury font-bold text-gray-900 tracking-tighter">
            KRISTAL<span className="text-amber-600 text-[10px] ml-1 font-normal italic uppercase block tracking-[0.4em] mt-2">Beauty Atelier</span>
          </h1>
        </div>
        
        <nav className="flex-1 px-10 space-y-4">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-5 px-6 py-4 rounded-3xl transition-all duration-700 group ${
                activeTab === item.id 
                  ? 'bg-amber-600 text-white shadow-2xl shadow-amber-200/50 scale-[1.03]' 
                  : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <i className={`fas ${item.icon} w-5 text-lg transition-transform group-hover:scale-110`}></i>
              <span className="font-bold text-[12px] uppercase tracking-[0.2em]">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-10 border-t border-gray-50 bg-gray-50/30">
          {!isGuest ? (
            <div className="space-y-6">
              <div className="flex items-center space-x-4 px-2">
                <div className="relative">
                  <img src={user.avatar || `https://ui-avatars.com/api/?name=${user.fullName}&background=d97706&color=fff`} className="w-12 h-12 rounded-full border-2 border-white shadow-md" />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                </div>
                <div className="overflow-hidden">
                  <p className="text-[11px] font-bold text-gray-900 truncate uppercase tracking-tighter">{user.fullName}</p>
                  <p className="text-[9px] text-amber-600 font-bold uppercase tracking-widest">{isAdmin ? 'Direzione' : 'Premium Guest'}</p>
                </div>
              </div>
              <button 
                onClick={onLogout}
                className="w-full flex items-center space-x-4 px-6 py-4 text-gray-400 hover:text-red-500 rounded-2xl transition-all group"
              >
                <i className="fas fa-sign-out-alt group-hover:-translate-x-1 transition-transform"></i>
                <span className="text-[10px] font-bold uppercase tracking-[0.3em]">Congedarsi</span>
              </button>
            </div>
          ) : (
            <button 
              onClick={onLoginClick}
              className="w-full flex items-center justify-center space-x-3 px-6 py-5 bg-gray-900 text-white rounded-3xl transition-all hover:bg-black shadow-2xl"
            >
              <i className="fas fa-sign-in-alt text-xs"></i>
              <span className="text-[10px] font-bold uppercase tracking-[0.3em]">Accedi</span>
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 md:p-20 overflow-y-auto pb-40 md:pb-20">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>

      {/* Mobile Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-2xl border-t border-gray-100 px-8 py-5 flex justify-around items-center z-50 rounded-t-[3.5rem] shadow-[-10px_0_30px_rgba(0,0,0,0.03)]">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center space-y-2 transition-all duration-300 ${
              activeTab === item.id ? 'text-amber-600 scale-110' : 'text-gray-300 hover:text-gray-500'
            }`}
          >
            <i className={`fas ${item.icon} text-xl`}></i>
            <span className="text-[8px] font-bold uppercase tracking-[0.2em]">{item.label.split(' ')[0]}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default Layout;
