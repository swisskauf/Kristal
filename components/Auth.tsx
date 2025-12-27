
import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { User } from '../types';

interface AuthProps {
  onLogin: (user: User) => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<'M' | 'F' | 'Other'>('F');
  const [dob, setDob] = useState('');
  const [avatar, setAvatar] = useState('');
  
  const [errorMsg, setErrorMsg] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    if (isRegistering && password !== confirmPassword) {
      setErrorMsg("Le password non coincidono.");
      setLoading(false);
      return;
    }

    try {
      if (isRegistering) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { 
              full_name: fullName, 
              phone, 
              role: 'client', 
              gender, 
              dob, 
              avatar 
            },
          }
        });
        if (error) throw error;
        setEmailSent(true);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) {
          const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).maybeSingle();
          onLogin({
            id: data.user.id,
            email: data.user.email!,
            fullName: profile?.full_name || 'Ospite Kristal',
            phone: profile?.phone || '',
            role: profile?.role || 'client'
          });
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Errore autenticazione.');
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="w-full bg-white rounded-[4rem] p-12 text-center shadow-2xl border border-gray-50">
        <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-8">
           <i className="fas fa-paper-plane text-amber-600 text-2xl"></i>
        </div>
        <h2 className="text-3xl font-luxury font-bold mb-4">Verifica Email</h2>
        <p className="text-gray-500 text-xs mb-10 leading-relaxed">Abbiamo inviato un rituale di conferma a <strong>{email}</strong>. Seguite il link per attivare l'account.</p>
        <button onClick={() => setEmailSent(false)} className="text-[10px] font-bold text-amber-600 uppercase tracking-widest hover:underline border border-amber-600 px-8 py-3 rounded-full">Indietro</button>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-[4rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] overflow-hidden">
      <div className="p-10 md:p-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-luxury font-bold text-gray-900 tracking-tighter mb-2">KRISTAL</h1>
          <p className="text-amber-600 text-[10px] uppercase tracking-[0.4em] font-bold">L'Eccellenza è un Rituale</p>
        </div>

        {errorMsg && <div className="mb-8 p-4 rounded-2xl bg-red-50 text-red-600 text-[10px] font-bold border border-red-100">{errorMsg}</div>}

        <form onSubmit={handleAuth} className="space-y-5">
          {isRegistering && (
            <div className="grid md:grid-cols-2 gap-4 animate-in slide-in-from-top-4">
              <input type="text" placeholder="Nome & Cognome" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 border-none outline-none text-xs font-bold shadow-inner" />
              <input type="tel" placeholder="N. Cellulare" required value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 border-none outline-none text-xs font-bold shadow-inner" />
              <div className="space-y-1">
                <label className="text-[8px] font-bold text-gray-400 uppercase ml-2">Genere</label>
                <select value={gender} onChange={e => setGender(e.target.value as any)} className="w-full p-4 rounded-2xl bg-gray-50 border-none outline-none text-xs font-bold shadow-inner">
                  <option value="F">Femmina</option>
                  <option value="M">Maschio</option>
                  <option value="Other">Altro</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[8px] font-bold text-gray-400 uppercase ml-2">Data di Nascita</label>
                <input type="date" required value={dob} onChange={(e) => setDob(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 border-none outline-none text-xs font-bold shadow-inner" />
              </div>
              <input type="text" placeholder="Foto URL (Opzionale)" value={avatar} onChange={(e) => setAvatar(e.target.value)} className="w-full md:col-span-2 p-4 rounded-2xl bg-gray-50 border-none outline-none text-xs font-bold shadow-inner" />
            </div>
          )}
          
          <input type="email" placeholder="Indirizzo Email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 border-none outline-none text-xs font-bold shadow-inner" />
          
          <div className="grid md:grid-cols-2 gap-4">
            <input type="password" placeholder="Password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 border-none outline-none text-xs font-bold shadow-inner" />
            {isRegistering && <input type="password" placeholder="Conferma Password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 border-none outline-none text-xs font-bold shadow-inner" />}
          </div>
          
          <button type="submit" disabled={loading} className="w-full py-5 bg-black text-white font-bold rounded-3xl shadow-2xl hover:bg-amber-700 transition-all uppercase text-[10px] tracking-widest mt-6">
            {loading ? <i className="fas fa-spinner animate-spin"></i> : (isRegistering ? 'Crea Account Kristal' : 'Accedi al Portale')}
          </button>
        </form>

        <div className="mt-10 text-center">
          <button onClick={() => { setIsRegistering(!isRegistering); setErrorMsg(''); }} className="text-[9px] font-bold text-gray-400 hover:text-amber-600 transition-colors uppercase tracking-[0.2em]">
            {isRegistering ? 'Hai già un account? Entra qui' : 'Nuovo Ospite? Registrati ora'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
