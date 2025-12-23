
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
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-80 bg-white border-r border-gray-100 shadow-sm sticky top-0 h-screen">
        <div className="p-12">
          <h1 className="text-4xl font-luxury font-bold text-gray-900 tracking-tighter">
            KRISTAL<span className="text-amber-500 text-[11px] ml-1 font-normal italic uppercase block tracking-widest mt-1">Beauty Atelier</span>
          </h1>
          {isAdmin && <span className="text-[9px] font-bold bg-black text-white px-3 py-1 rounded-full mt-4 inline-block uppercase tracking-[0.2em]">Direzione</span>}
        </div>
        
        <nav className="flex-1 px-8 space-y-3">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-4 px-6 py-4 rounded-[2rem] transition-all duration-500 ${
                activeTab === item.id 
                  ? 'bg-amber-500 text-white shadow-2xl shadow-amber-100 scale-[1.02]' 
                  : 'text-gray-400 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <i className={`fas ${item.icon} w-5 text-lg`}></i>
              <span className="font-bold text-[13px] uppercase tracking-widest">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-8 border-t border-gray-50">
          {!isGuest ? (
            <div className="space-y-4">
              <div className="flex items-center space-x-3 px-6 mb-6">
                <img src={user.avatar || `https://ui-avatars.com/api/?name=${user.fullName}&background=f59e0b&color=fff`} className="w-10 h-10 rounded-full border border-amber-100" />
                <div className="overflow-hidden">
                  <p className="text-[11px] font-bold text-gray-900 truncate uppercase tracking-tighter">{user.fullName}</p>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Premium Member</p>
                </div>
              </div>
              <button 
                onClick={onLogout}
                className="w-full flex items-center space-x-4 px-6 py-4 text-red-400 hover:bg-red-50 rounded-[2rem] transition-colors"
              >
                <i className="fas fa-sign-out-alt"></i>
                <span className="text-[11px] font-bold uppercase tracking-widest">Congedati</span>
              </button>
            </div>
          ) : (
            <button 
              onClick={onLoginClick}
              className="w-full flex items-center space-x-4 px-6 py-4 bg-gray-900 text-white rounded-[2rem] transition-all hover:bg-black shadow-xl"
            >
              <i className="fas fa-sign-in-alt"></i>
              <span className="text-[11px] font-bold uppercase tracking-widest">Benvenuto</span>
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-16 overflow-y-auto pb-36 md:pb-16 bg-[#fafafa]">
        <div className="max-w-5xl mx-auto">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 border-t border-gray-100 px-8 py-4 flex justify-between items-center z-50 backdrop-blur-2xl shadow-[0_-20px_40px_rgba(0,0,0,0.05)] rounded-t-[3rem]">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center space-y-2 ${
              activeTab === item.id ? 'text-amber-500 scale-110' : 'text-gray-300'
            } transition-all duration-300`}
          >
            <i className={`fas ${item.icon} text-xl`}></i>
            <span className="text-[8px] font-bold uppercase tracking-[0.2em]">{item.label.split(' ')[0]}</span>
          </button>
        ))}
        {!isGuest ? (
          <button onClick={onLogout} className="flex flex-col items-center space-y-2 text-red-300">
             <i className="fas fa-power-off text-xl"></i>
             <span className="text-[8px] font-bold uppercase tracking-[0.2em]">Esci</span>
          </button>
        ) : (
          <button onClick={onLoginClick} className="flex flex-col items-center space-y-2 text-amber-500">
             <i className="fas fa-user-circle text-xl"></i>
             <span className="text-[8px] font-bold uppercase tracking-[0.2em]">Accedi</span>
          </button>
        )}
      </nav>
    </div>
  );
};

export default Layout;
