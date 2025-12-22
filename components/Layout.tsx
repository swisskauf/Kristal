
import React, { useState } from 'react';

interface LayoutProps {
  children: React.ReactNode;
  user: any;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, user, onLogout, activeTab, setActiveTab }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAdmin = user?.role === 'admin';

  const clientNav = [
    { id: 'dashboard', label: 'Home', icon: 'fa-home' },
    { id: 'calendar', label: 'I miei appuntamenti', icon: 'fa-calendar-alt' },
    { id: 'services', label: 'Servizi', icon: 'fa-sparkles' },
    { id: 'profile', label: 'Profilo', icon: 'fa-user' },
  ];

  const adminNav = [
    { id: 'admin_dashboard', label: 'Dashboard Admin', icon: 'fa-chart-pie' },
    { id: 'team_schedule', label: 'Agenda Team', icon: 'fa-calendar-day' },
    { id: 'manage_appointments', label: 'Tutti gli appuntamenti', icon: 'fa-tasks' },
    { id: 'services', label: 'Gestione Listino', icon: 'fa-list-ul' },
  ];

  const navItems = isAdmin ? adminNav : clientNav;

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#f8f9fa]">
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-100 shadow-sm sticky top-0 h-screen">
        <div className="p-8">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tighter">
            KRISTAL<span className="text-amber-500 text-[10px] ml-1 font-normal italic uppercase">Salon</span>
          </h1>
          {isAdmin && <span className="text-[10px] font-bold bg-amber-500 text-white px-2 py-0.5 rounded-full mt-2 inline-block">ADMIN MODE</span>}
        </div>
        
        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl transition-all duration-200 ${
                activeTab === item.id 
                  ? 'bg-gray-900 text-white shadow-lg' 
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <i className={`fas ${item.icon} w-5 text-center`}></i>
              <span className="font-medium text-sm">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 mt-auto border-t border-gray-50">
          <div className="flex items-center space-x-3 mb-4 p-2 bg-gray-50 rounded-2xl">
            <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold uppercase shadow-sm">
              {user?.fullName?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-gray-900 truncate">{user?.fullName}</p>
              <p className="text-[10px] text-gray-400 truncate uppercase tracking-widest">{user?.role}</p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-2xl transition-colors group"
          >
            <i className="fas fa-sign-out-alt group-hover:translate-x-1 transition-transform"></i>
            <span className="text-sm font-semibold">Esci</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
