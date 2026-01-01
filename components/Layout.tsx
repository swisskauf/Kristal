
import React, { useState } from 'react';

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
}

interface LayoutProps {
  children: React.ReactNode;
  user: any;
  onLogout: () => void;
  onLoginClick?: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  notifications?: NotificationItem[];
  onClearNotifications?: () => void;
}

const Layout: React.FC<LayoutProps> = ({ 
  children, user, onLogout, onLoginClick, activeTab, setActiveTab, 
  notifications = [], onClearNotifications 
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const isAdmin = user?.role === 'admin';
  const isCollaborator = user?.role === 'collaborator';
  const isGuest = !user;

  const adminNav = [
    { id: 'dashboard', label: 'Vision', icon: 'fa-chart-line' },
    { id: 'services_management', label: 'Servizi', icon: 'fa-book-open' },
    { id: 'team_schedule', label: 'Planning', icon: 'fa-calendar-alt' },
    { id: 'vacation_planning', label: 'Vacanze', icon: 'fa-plane-departure' },
    { id: 'team_management', label: 'Staff', icon: 'fa-users-cog' },
    { id: 'about_management', label: 'Editor', icon: 'fa-pen-fancy' },
    { id: 'clients', label: 'Ospiti', icon: 'fa-address-book' },
    { id: 'impostazioni', label: 'Settings', icon: 'fa-cog' },
  ];

  const collaboratorNav = [
    { id: 'dashboard', label: 'Dashboard', icon: 'fa-user-clock' },
    { id: 'team_schedule', label: 'Planning', icon: 'fa-calendar-alt' },
    { id: 'clients', label: 'Ospiti', icon: 'fa-address-book' },
  ];

  const clientNav = [
    { id: 'dashboard', label: 'Home', icon: 'fa-home' },
    { id: 'my_rituals', label: 'I Miei Ritual', icon: 'fa-calendar-check' },
    { id: 'about_us', label: 'Maison', icon: 'fa-gem' }, // Added here
  ];

  let navItems = guestNav();
  function guestNav() { return [{ id: 'dashboard', label: "Atelier", icon: 'fa-concierge-bell' }, { id: 'about_us', label: "Chi Siamo", icon: 'fa-gem' }]; }
  
  if (isAdmin) navItems = adminNav;
  else if (isCollaborator) navItems = collaboratorNav;
  else if (user) navItems = clientNav;
  else navItems = guestNav();

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#fcfcfc] overflow-x-hidden">
      {/* SIDEBAR DESKTOP */}
      <aside className="hidden md:flex flex-col w-72 bg-white border-r border-gray-50 sticky top-0 h-screen z-40">
        <div className="p-12">
          <h1 className="text-3xl font-luxury font-bold text-gray-900 tracking-tighter cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            KRISTAL<span className="text-amber-600 text-[8px] font-normal uppercase block tracking-[0.4em] mt-1">Beauty Atelier</span>
          </h1>
        </div>
        
        <nav className="flex-1 px-8 space-y-1 overflow-y-auto scrollbar-hide">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-4 px-6 py-4 rounded-2xl transition-all duration-300 ${
                activeTab === item.id 
                  ? 'bg-black text-white shadow-xl scale-[1.02]' 
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
            <div className="space-y-4 border-t border-gray-50 pt-8">
              <div className="flex items-center space-x-3 px-2">
                <img src={user.avatar || `https://ui-avatars.com/api/?name=${user.fullName}&background=000&color=fff`} className="w-8 h-8 rounded-full object-cover border border-gray-100" />
                <div className="overflow-hidden">
                  <p className="text-[10px] font-bold text-gray-900 truncate uppercase tracking-tighter">{user.fullName}</p>
                  <p className="text-[8px] text-amber-600 font-bold uppercase tracking-widest">
                    {isAdmin ? 'Direzione' : isCollaborator ? 'Staff' : 'Ospite'}
                  </p>
                </div>
              </div>
              <button 
                onClick={onLogout}
                className="w-full flex items-center space-x-3 px-4 py-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
              >
                <i className="fas fa-sign-out-alt text-xs"></i>
                <span className="text-[9px] font-bold uppercase tracking-[0.3em]">Congedarsi</span>
              </button>
            </div>
          ) : (
            <button 
              onClick={onLoginClick}
              className="w-full py-5 bg-black text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-xl hover:bg-amber-600 transition-all"
            >
              Accedi
            </button>
          )}
        </div>
      </aside>

      {/* MOBILE HEADER */}
      <div className="md:hidden flex items-center justify-between p-4 px-6 bg-white border-b border-gray-50 sticky top-0 z-[500] w-full shadow-sm">
        <h1 className="text-xl font-luxury font-bold text-gray-900 tracking-tighter" onClick={() => setActiveTab('dashboard')}>KRISTAL</h1>
        <div className="flex items-center gap-4">
           {notifications.length > 0 && (
             <button onClick={() => setShowNotifications(!showNotifications)} className="relative text-gray-900">
               <i className="fas fa-bell text-lg"></i>
               <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse border border-white"></span>
             </button>
           )}
           {isGuest && (
             <button onClick={onLoginClick} className="text-[9px] font-bold uppercase tracking-widest text-amber-600 border border-amber-600 px-4 py-2 rounded-full">Accedi</button>
           )}
           {!isGuest && (
             <div className="flex items-center gap-3">
                <img src={user.avatar || `https://ui-avatars.com/api/?name=${user.fullName}&background=000&color=fff`} className="w-10 h-10 rounded-full border border-gray-100" />
             </div>
           )}
        </div>
      </div>

      {/* NOTIFICATIONS DROPDOWN / MODAL */}
      {showNotifications && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[2000] flex justify-end items-start md:p-6" onClick={() => setShowNotifications(false)}>
           <div className="bg-white w-full md:w-96 md:rounded-[2rem] h-full md:h-[600px] shadow-2xl flex flex-col mt-0 md:mt-16 overflow-hidden animate-in slide-in-from-right-10" onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                 <h4 className="text-[11px] font-bold uppercase tracking-widest text-gray-900">Centro Notifiche</h4>
                 <button onClick={onClearNotifications} className="text-[9px] font-bold text-amber-600 hover:text-black transition-colors">Pulisci Tutto</button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                 {notifications.length === 0 ? (
                    <div className="text-center py-10 text-gray-300 text-[10px] uppercase font-bold tracking-widest">Nessuna notifica</div>
                 ) : (
                    notifications.map(notif => (
                       <div key={notif.id} className="p-5 bg-white border border-gray-100 rounded-3xl shadow-sm hover:shadow-md transition-all">
                          <div className="flex justify-between items-start mb-2">
                             <p className="text-[10px] font-bold text-gray-900 uppercase tracking-wide">{notif.title}</p>
                             <span className="text-[8px] font-bold text-gray-300">{notif.time}</span>
                          </div>
                          <p className="text-xs text-gray-500 leading-relaxed font-medium line-clamp-4">{notif.body}</p>
                       </div>
                    ))
                 )}
              </div>
           </div>
        </div>
      )}

      {/* DESKTOP NOTIFICATION BELL (Fixed Position) */}
      {!isGuest && (
         <div className="fixed top-8 right-10 z-[100] hidden md:block">
            <button 
              onClick={() => setShowNotifications(!showNotifications)} 
              className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg hover:bg-black hover:text-white transition-all group relative border border-gray-50"
            >
               <i className={`fas ${showNotifications ? 'fa-times' : 'fa-bell'} text-sm`}></i>
               {notifications.length > 0 && !showNotifications && (
                  <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
               )}
            </button>
         </div>
      )}

      <main className="flex-1 p-4 md:p-16 overflow-y-auto pb-32 md:pb-16 bg-[#fcfcfc] w-full">
        <div className="max-w-6xl mx-auto w-full">
          {children}
        </div>
      </main>

      {/* BOTTOM NAV MOBILE */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gray-100 px-2 py-3 flex justify-around items-center z-[500] shadow-[0_-10px_40px_rgba(0,0,0,0.05)] overflow-x-auto scrollbar-hide">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center space-y-1 transition-all flex-shrink-0 min-w-[70px] ${
              activeTab === item.id ? 'text-black scale-110' : 'text-gray-300'
            }`}
          >
            <i className={`fas ${item.icon} text-lg`}></i>
            <span className="text-[6px] font-bold uppercase tracking-widest">{item.label}</span>
          </button>
        ))}
        {!isGuest && (
          <button onClick={onLogout} className="flex flex-col items-center space-y-1 text-gray-300 hover:text-red-500 flex-shrink-0 min-w-[70px]">
            <i className="fas fa-sign-out-alt text-lg"></i>
            <span className="text-[6px] font-bold uppercase tracking-widest">Esci</span>
          </button>
        )}
      </nav>
    </div>
  );
};

export default Layout;
