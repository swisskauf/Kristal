
import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { User } from '../types';

interface AuthProps {
  onLogin: (user: User) => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Basic Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  
  // Extra Fields
  const [gender, setGender] = useState<'M' | 'F' | 'Other'>('F');
  const [dob, setDob] = useState('');
  
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
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName, phone, role: 'client', gender, dob },
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
      <div className="w-full bg-white rounded-[3rem] p-10 text-center animate-in zoom-in-95">
        <h2 className="text-3xl font-luxury font-bold mb-4">Verifica la tua Email</h2>
        <p className="text-gray-500 text-xs mb-8">Abbiamo inviato un link di conferma a {email}.</p>
        <button onClick={() => setEmailSent(false)} className="text-[10px] font-bold text-amber-600 uppercase tracking-widest hover:underline">Torna al login</button>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-[3rem] border border-white/10 overflow-hidden animate-in fade-in zoom-in-95">
      <div className="p-10 md:p-14">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-luxury font-bold text-gray-900 mb-2">KRISTAL</h1>
          <p className="text-gray-400 text-[9px] uppercase tracking-[0.3em]">Atelier di Bellezza</p>
        </div>

        {errorMsg && <div className="mb-6 p-4 rounded-2xl bg-red-50 text-red-600 text-[10px] font-bold border border-red-100">{errorMsg}</div>}

        <form onSubmit={handleAuth} className="space-y-4">
          {isRegistering && (
            <div className="grid md:grid-cols-2 gap-4">
              <input type="text" placeholder="Nome Completo" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 outline-none text-xs font-bold" />
              <input type="tel" placeholder="Cellulare" required value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 outline-none text-xs font-bold" />
              <select value={gender} onChange={e => setGender(e.target.value as any)} className="w-full p-4 rounded-2xl bg-gray-50 outline-none text-xs font-bold">
                <option value="F">Femmina</option>
                <option value="M">Maschio</option>
                <option value="Other">Altro</option>
              </select>
              <input type="date" placeholder="Data Nascita" required value={dob} onChange={(e) => setDob(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 outline-none text-xs font-bold" />
            </div>
          )}
          <input type="email" placeholder="Email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 outline-none text-xs font-bold" />
          <div className="grid md:grid-cols-2 gap-4">
            <input type="password" placeholder="Password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 outline-none text-xs font-bold" />
            {isRegistering && <input type="password" placeholder="Conferma Password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 outline-none text-xs font-bold" />}
          </div>
          
          <button type="submit" disabled={loading} className="w-full py-4 bg-gray-900 text-white font-bold rounded-2xl shadow-xl hover:bg-black transition-all">
            {loading ? <i className="fas fa-spinner animate-spin"></i> : (isRegistering ? 'Crea Account Kristal' : 'Entra in Atelier')}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button onClick={() => setIsRegistering(!isRegistering)} className="text-[10px] font-bold text-gray-400 hover:text-amber-600 transition-colors uppercase tracking-widest">
            {isRegistering ? 'Hai già un profilo? Accedi' : 'Nuovo in Atelier? Registrati'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
