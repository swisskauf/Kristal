
import React, { useState } from 'react';

interface LayoutProps {
  children: React.ReactNode;
  user: any;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, user, onLogout, activeTab, setActiveTab }) => {
  const isAdmin = user?.role === 'admin';

  const clientNav = [
    { id: 'dashboard', label: 'Prenota', icon: 'fa-plus-circle' },
    { id: 'calendar', label: 'I miei appuntamenti', icon: 'fa-calendar-alt' },
    { id: 'profile', label: 'Il mio account', icon: 'fa-user' },
  ];

  const adminNav = [
    { id: 'admin_dashboard', label: 'Statistiche', icon: 'fa-chart-pie' },
    { id: 'team_schedule', label: 'Agenda Team', icon: 'fa-calendar-day' },
    { id: 'services', label: 'Gestione Servizi', icon: 'fa-list-ul' },
    { id: 'calendar', label: 'Tutti gli appuntamenti', icon: 'fa-tasks' },
  ];

  const navItems = isAdmin ? adminNav : clientNav;

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#fdfdfd]">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-72 bg-white border-r border-gray-100 shadow-sm sticky top-0 h-screen">
        <div className="p-10">
          <h1 className="text-3xl font-luxury font-bold text-gray-900 tracking-tighter">
            KRISTAL<span className="text-amber-500 text-[10px] ml-1 font-normal italic uppercase">Salon</span>
          </h1>
          {isAdmin && <span className="text-[10px] font-bold bg-amber-500 text-white px-2 py-0.5 rounded-full mt-2 inline-block">PANNELLO ADMIN</span>}
        </div>
        
        <nav className="flex-1 px-6 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-4 px-5 py-4 rounded-[1.5rem] transition-all duration-300 ${
                activeTab === item.id 
                  ? 'bg-gray-900 text-white shadow-xl shadow-gray-200' 
                  : 'text-gray-400 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <i className={`fas ${item.icon} w-5 text-lg`}></i>
              <span className="font-bold text-sm">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-gray-50">
          <button 
            onClick={onLogout}
            className="w-full flex items-center space-x-4 px-5 py-4 text-red-400 hover:bg-red-50 rounded-[1.5rem] transition-colors"
          >
            <i className="fas fa-sign-out-alt"></i>
            <span className="text-sm font-bold">Esci dall'account</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-5 md:p-12 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-3 flex justify-between items-center z-50 backdrop-blur-lg bg-white/90 shadow-2xl">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center space-y-1 ${
              activeTab === item.id ? 'text-amber-500' : 'text-gray-300'
            }`}
          >
            <i className={`fas ${item.icon} text-lg`}></i>
            <span className="text-[8px] font-bold uppercase tracking-widest">{item.label.split(' ')[0]}</span>
          </button>
        ))}
        <button onClick={onLogout} className="flex flex-col items-center space-y-1 text-red-300">
           <i className="fas fa-sign-out-alt text-lg"></i>
           <span className="text-[8px] font-bold uppercase tracking-widest">Esci</span>
        </button>
      </nav>
    </div>
  );
};

export default Layout;
