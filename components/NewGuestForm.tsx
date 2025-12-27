
import React, { useState } from 'react';

interface NewGuestFormProps {
  onSave: (guest: any) => void;
  onCancel: () => void;
  initialData?: any;
}

const NewGuestForm: React.FC<NewGuestFormProps> = ({ onSave, onCancel, initialData }) => {
  const [firstName, setFirstName] = useState(initialData?.full_name?.split(' ')[0] || '');
  const [lastName, setLastName] = useState(initialData?.full_name?.split(' ')[1] || '');
  const [email, setEmail] = useState(initialData?.email || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [password, setPassword] = useState('');
  const [gender, setGender] = useState<'M' | 'F' | 'Other'>(initialData?.gender || 'F');
  const [dob, setDob] = useState(initialData?.dob || '');
  const [avatar, setAvatar] = useState<string | null>(initialData?.avatar || null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: initialData?.id,
      full_name: `${firstName} ${lastName}`,
      email,
      phone,
      gender,
      dob,
      avatar,
      role: 'client',
      // In a real app we wouldn't handle passwords like this here
      password: password || undefined 
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
      <header className="text-center mb-8">
        <h3 className="text-3xl font-luxury font-bold text-gray-900">{initialData ? 'Modifica Ospite' : 'Nuovo Ospite'}</h3>
        <p className="text-[10px] text-amber-600 font-bold uppercase tracking-widest mt-2">Dati Profilo Kristal</p>
      </header>

      <div className="flex flex-col items-center mb-8">
        <div className="relative group cursor-pointer w-32 h-32">
          <img 
            src={avatar || `https://ui-avatars.com/api/?name=${firstName}+${lastName}&background=f3f4f6&color=9ca3af`} 
            className="w-full h-full rounded-[2.5rem] object-cover border-4 border-white shadow-xl transition-all group-hover:opacity-80" 
          />
          <label className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer bg-black/20 rounded-[2.5rem]">
            <i className="fas fa-camera text-2xl text-white"></i>
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </label>
        </div>
        <p className="text-[8px] font-bold text-gray-400 uppercase mt-4 tracking-widest">Upload foto obbligatorio</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <input required placeholder="Nome" type="text" value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 border-none font-bold text-xs shadow-inner" />
        <input required placeholder="Cognome" type="text" value={lastName} onChange={e => setLastName(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 border-none font-bold text-xs shadow-inner" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <input required placeholder="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 border-none font-bold text-xs shadow-inner" />
        <input required placeholder="Telefono" type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 border-none font-bold text-xs shadow-inner" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <select value={gender} onChange={e => setGender(e.target.value as any)} className="w-full p-4 rounded-2xl bg-gray-50 border-none font-bold text-xs shadow-inner">
          <option value="F">Femmina</option>
          <option value="M">Maschio</option>
          <option value="Other">Altro</option>
        </select>
        <input required type="date" value={dob} onChange={e => setDob(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 border-none font-bold text-xs shadow-inner" />
      </div>

      {!initialData && (
        <input placeholder="Imposta Password Temporanea" type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 border-none font-bold text-xs shadow-inner" />
      )}

      <div className="flex gap-4 pt-8 border-t border-gray-100">
        <button type="button" onClick={onCancel} className="flex-1 py-5 text-gray-400 font-bold uppercase text-[10px] tracking-widest">Annulla</button>
        <button type="submit" className="flex-[2] py-5 bg-black text-white rounded-3xl font-bold uppercase text-[10px] tracking-widest shadow-2xl hover:bg-amber-700 transition-all">
          {initialData ? 'Salva Modifiche' : 'Crea e Sincronizza'}
        </button>
      </div>
    </form>
  );
};

export default NewGuestForm;
