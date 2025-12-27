
import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { Service, TeamMember, Appointment } from '../types';

interface VisionAnalyticsProps {
  team: TeamMember[];
  appointments: Appointment[];
  services: Service[];
}

const VisionAnalytics: React.FC<VisionAnalyticsProps> = ({ team, appointments, services }) => {
  const COLORS = ['#d97706', '#000000', '#4b5563', '#9ca3af', '#f3f4f6'];

  const statsByArtist = team.map(m => {
    const appts = appointments.filter(a => a.team_member_name === m.name && a.status === 'confirmed');
    const revenue = appts.reduce((acc, a) => acc + (a.services?.price || 0), 0);
    return { name: m.name, ricavi: revenue, rituali: appts.length };
  });

  const statsByCategory = services.map(s => {
    const count = appointments.filter(a => a.service_id === s.id).length;
    return { name: s.category, value: count };
  }).reduce((acc: any[], curr) => {
    const existing = acc.find(item => item.name === curr.name);
    if (existing) existing.value += curr.value;
    else acc.push(curr);
    return acc;
  }, []);

  const totalRevenue = statsByArtist.reduce((acc, s) => acc + s.ricavi, 0);
  const totalRituals = statsByArtist.reduce((acc, s) => acc + s.rituali, 0);
  const avgRitualValue = totalRituals > 0 ? (totalRevenue / totalRituals).toFixed(2) : 0;

  return (
    <div className="space-y-12 animate-in fade-in duration-1000">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-black text-white p-10 rounded-[4rem] shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-125 transition-transform">
            <i className="fas fa-coins text-6xl"></i>
          </div>
          <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-2">Ricavo Complessivo</p>
          <h3 className="text-4xl font-luxury font-bold">CHF {totalRevenue}</h3>
          <p className="text-[9px] text-gray-400 mt-4 uppercase tracking-tighter">Performance Atelier Kristal</p>
        </div>
        
        <div className="bg-white p-10 rounded-[4rem] border border-gray-100 shadow-sm">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Scontrino Medio</p>
          <h3 className="text-4xl font-luxury font-bold text-gray-900">CHF {avgRitualValue}</h3>
          <p className="text-[9px] text-amber-600 mt-4 uppercase tracking-tighter">Valore per Ritual</p>
        </div>

        <div className="bg-white p-10 rounded-[4rem] border border-gray-100 shadow-sm">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Rituali Eseguiti</p>
          <h3 className="text-4xl font-luxury font-bold text-gray-900">{totalRituals}</h3>
          <p className="text-[9px] text-amber-600 mt-4 uppercase tracking-tighter">Volume Esperienze</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="bg-white p-10 rounded-[4rem] border border-gray-100 shadow-sm space-y-8">
          <header>
            <h4 className="font-luxury font-bold text-2xl">Produttività Artisti</h4>
            <p className="text-[9px] text-gray-400 uppercase tracking-widest mt-1">Volume d'affari per collaboratore</p>
          </header>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statsByArtist}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontSize: '10px'}}
                  cursor={{fill: '#fcfcfc'}}
                />
                <Bar dataKey="ricavi" fill="#000" radius={[20, 20, 20, 20]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-10 rounded-[4rem] border border-gray-100 shadow-sm space-y-8">
          <header>
            <h4 className="font-luxury font-bold text-2xl">Mix Servizi</h4>
            <p className="text-[9px] text-gray-400 uppercase tracking-widest mt-1">Distribuzione per categoria</p>
          </header>
          <div className="h-[300px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statsByCategory}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {statsByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                   contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontSize: '10px'}}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute text-center">
               <p className="text-[8px] font-bold text-gray-400 uppercase">Focus</p>
               <p className="text-xl font-luxury font-bold">Ritual</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-12 rounded-[4rem] border border-gray-100 shadow-sm space-y-8">
        <header>
          <h4 className="font-luxury font-bold text-2xl">Occupazione Atelier</h4>
          <p className="text-[9px] text-gray-400 uppercase tracking-widest mt-1">Saturazione agenda oraria</p>
        </header>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
           {team.map((m, i) => {
             const appts = appointments.filter(a => a.team_member_name === m.name);
             const percentage = Math.min(Math.round((appts.length / 20) * 100), 100);
             return (
               <div key={m.name} className="p-6 bg-gray-50 rounded-3xl space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold uppercase">{m.name}</span>
                    <span className="text-[10px] font-bold text-amber-600">{percentage}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-black rounded-full" style={{width: `${percentage}%`}}></div>
                  </div>
               </div>
             )
           })}
        </div>
      </div>
    </div>
  );
};

export default VisionAnalytics;
