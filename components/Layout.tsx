
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

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'fa-chart-line' },
    { id: 'calendar', label: 'Agenda', icon: 'fa-calendar-alt' },
    { id: 'services', label: 'Servizi', icon: 'fa-sparkles' },
    { id: 'profile', label: 'Profilo', icon: 'fa-user' },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#f8f9fa]">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-100 shadow-sm sticky top-0 h-screen">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-800 tracking-tighter">
            KRISTAL<span className="text-amber-500 text-xs ml-1 font-normal italic">SALON</span>
          </h1>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                activeTab === item.id 
                  ? 'bg-amber-50 text-amber-600 shadow-sm' 
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
              }`}
            >
              <i className={`fas ${item.icon} w-5 text-center`}></i>
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 mt-auto border-t border-gray-50">
          <div className="flex items-center space-x-3 mb-4 p-2">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold uppercase">
              {user?.fullName?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{user?.fullName}</p>
              <p className="text-xs text-gray-400 truncate">{user?.role}</p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="w-full flex items-center space-x-3 px-4 py-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            <i className="fas fa-sign-out-alt"></i>
            <span className="text-sm font-medium">Esci</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden bg-white px-6 py-4 flex items-center justify-between border-b border-gray-100 sticky top-0 z-50">
        <h1 className="text-xl font-bold text-gray-800">KRISTAL</h1>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-gray-600">
          <i className={`fas ${mobileMenuOpen ? 'fa-times' : 'fa-bars'} text-xl`}></i>
        </button>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-white pt-20 px-6">
          <nav className="space-y-4">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center space-x-4 p-4 rounded-xl ${
                  activeTab === item.id ? 'bg-amber-50 text-amber-600' : 'text-gray-600'
                }`}
              >
                <i className={`fas ${item.icon} text-xl`}></i>
                <span className="text-lg font-medium">{item.label}</span>
              </button>
            ))}
            <button 
              onClick={onLogout}
              className="w-full flex items-center space-x-4 p-4 text-red-500"
            >
              <i className="fas fa-sign-out-alt text-xl"></i>
              <span className="text-lg font-medium">Logout</span>
            </button>
          </nav>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
