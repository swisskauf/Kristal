
import React, { useState } from 'react';
import { TeamMember } from '../types';

interface NewStaffFormProps {
  onSave: (member: TeamMember) => void;
  onCancel: () => void;
}

const NewStaffForm: React.FC<NewStaffFormProps> = ({ onSave, onCancel }) => {
  const [name, setName] = useState('');
  const [role, setRole] = useState('Senior Stylist');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState('');
  const [workStart, setWorkStart] = useState('08:30');
  const [workEnd, setWorkEnd] = useState('18:30');
  const [breakStart, setBreakStart] = useState('13:00');
  const [breakEnd, setBreakEnd] = useState('14:00');
  const [address, setAddress] = useState('');
  const [avs, setAvs] = useState('');
  const [iban, setIban] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      name,
      role,
      bio,
      avatar: avatar || `https://ui-avatars.com/api/?name=${name}&background=f3f4f6&color=9ca3af`,
      work_start_time: workStart,
      work_end_time: workEnd,
      break_start_time: breakStart,
      break_end_time: breakEnd,
      address,
      avs_number: avs,
      iban,
      weekly_closures: [0], // Domenica chiuso di default
      unavailable_dates: [],
      absences_json: []
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
      <header className="text-center mb-8">
        <h3 className="text-3xl font-luxury font-bold text-gray-900">Nuovo Artista</h3>
        <p className="text-[10px] text-amber-600 font-bold uppercase tracking-widest mt-2">Iscrizione Staff Kristal</p>
      </header>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-[9px] font-bold text-gray-400 uppercase ml-2">Nome Arte</label>
          <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 border-none font-bold text-xs shadow-inner" placeholder="es. Melk" />
        </div>
        <div className="space-y-2">
          <label className="text-[9px] font-bold text-gray-400 uppercase ml-2">Ruolo</label>
          <select value={role} onChange={e => setRole(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 border-none font-bold text-xs shadow-inner">
            <option value="Senior Stylist">Senior Stylist</option>
            <option value="Creative Director">Creative Director</option>
            <option value="Color Specialist">Color Specialist</option>
            <option value="Master Esthetician">Master Esthetician</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-[9px] font-bold text-gray-400 uppercase ml-2">Biografia Breve</label>
        <textarea rows={2} value={bio} onChange={e => setBio(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 border-none font-bold text-xs shadow-inner resize-none" placeholder="Descrivi il talento dell'artista..." />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-gray-50 p-6 rounded-[2rem] space-y-4">
          <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest">Orari Lavoro</p>
          <div className="flex items-center gap-3">
            <input type="time" value={workStart} onChange={e => setWorkStart(e.target.value)} className="flex-1 p-2 bg-white rounded-lg text-xs font-bold" />
            <span className="text-gray-300">-</span>
            <input type="time" value={workEnd} onChange={e => setWorkEnd(e.target.value)} className="flex-1 p-2 bg-white rounded-lg text-xs font-bold" />
          </div>
        </div>
        <div className="bg-amber-50/30 p-6 rounded-[2rem] space-y-4">
          <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest">Pausa Pranzo</p>
          <div className="flex items-center gap-3">
            <input type="time" value={breakStart} onChange={e => setBreakStart(e.target.value)} className="flex-1 p-2 bg-white rounded-lg text-xs font-bold" />
            <span className="text-gray-300">-</span>
            <input type="time" value={breakEnd} onChange={e => setBreakEnd(e.target.value)} className="flex-1 p-2 bg-white rounded-lg text-xs font-bold" />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest ml-2">Dati Contrattuali</p>
        <input placeholder="Indirizzo Residenza" type="text" value={address} onChange={e => setAddress(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 border-none font-bold text-xs shadow-inner" />
        <div className="grid md:grid-cols-2 gap-6">
          <input placeholder="Numero AVS" type="text" value={avs} onChange={e => setAvs(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 border-none font-bold text-xs shadow-inner" />
          <input placeholder="IBAN" type="text" value={iban} onChange={e => setIban(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 border-none font-bold text-xs shadow-inner" />
        </div>
      </div>

      <div className="flex gap-4 pt-8 border-t border-gray-100">
        <button type="button" onClick={onCancel} className="flex-1 py-5 text-gray-400 font-bold uppercase text-[10px] tracking-widest">Annulla</button>
        <button type="submit" className="flex-[2] py-5 bg-black text-white rounded-3xl font-bold uppercase text-[10px] tracking-widest shadow-2xl hover:bg-amber-700 transition-all">
          Crea Profilo Artista
        </button>
      </div>
    </form>
  );
};

export default NewStaffForm;
