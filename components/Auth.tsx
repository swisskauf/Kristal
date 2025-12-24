
import React, { useState, useEffect } from 'react';
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
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  const getRedirectUrl = () => window.location.origin;

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('error_description')) {
      const params = new URLSearchParams(hash.replace('#', '?'));
      const description = params.get('error_description');
      if (description) setErrorMsg(decodeURIComponent(description).replace(/\+/g, ' '));
    }
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      if (isRegistering) {
        // Verifica di sicurezza prima di chiamare la funzione
        if (typeof supabase.auth.signUp !== 'function') {
          throw new Error("Il servizio di registrazione non è configurato correttamente sul server.");
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName, phone, role: 'client' },
            emailRedirectTo: getRedirectUrl(),
          }
        });
        
        if (error) throw error;
        
        if (data.user && data.session === null) {
          setEmailSent(true);
        } else if (data.user && data.session) {
          handleProfileLogin(data.user);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) handleProfileLogin(data.user);
      }
    } catch (err: any) {
      console.error("Auth Error:", err);
      setErrorMsg(err.message || 'Errore durante l\'autenticazione. Verifica le credenziali o la connessione.');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileLogin = async (supabaseUser: any) => {
    try {
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', supabaseUser.id).maybeSingle();
      
      const userEmail = supabaseUser.email?.toLowerCase();
      let finalRole: 'admin' | 'collaborator' | 'client' = profile?.role || 'client';
      
      if (userEmail === 'serop.serop@outlook.com') finalRole = 'admin';
      else if (userEmail === 'sirop.sirop@outlook.sa') finalRole = 'collaborator';

      onLogin({
        id: supabaseUser.id,
        email: supabaseUser.email!,
        fullName: profile?.full_name || fullName || 'Ospite Kristal',
        phone: profile?.phone || phone || '',
        role: finalRole
      });
    } catch (e) {
      // Fallback se il database non risponde
      onLogin({
        id: supabaseUser.id,
        email: supabaseUser.email!,
        fullName: fullName || 'Ospite Kristal',
        phone: phone || '',
        role: 'client'
      });
    }
  };

  const signInWithGoogle = async () => {
    setErrorMsg('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({ 
        provider: 'google',
        options: { redirectTo: getRedirectUrl() }
      });
      if (error) throw error;
    } catch (err: any) {
      setErrorMsg(err.message || "Servizio Google momentaneamente non disponibile.");
    }
  };

  if (emailSent) {
    return (
      <div className="w-full bg-white rounded-[3rem] shadow-2xl p-10 text-center animate-in zoom-in-95">
        <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <i className="fas fa-paper-plane text-2xl"></i>
        </div>
        <h2 className="text-2xl font-luxury font-bold mb-4">Quasi fatto!</h2>
        <p className="text-gray-500 text-xs leading-relaxed mb-8">
          Abbiamo inviato un link di conferma a <strong>{email}</strong>. Clicca sul link per attivare il tuo profilo Kristal.
        </p>
        <button onClick={() => setEmailSent(false)} className="text-[10px] font-bold text-amber-600 uppercase tracking-widest hover:underline">Torna al login</button>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-[3rem] shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95">
      <div className="p-10 md:p-14">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-luxury font-bold tracking-tighter text-gray-900 mb-2">KRISTAL</h1>
          <p className="text-gray-400 text-[9px] uppercase tracking-[0.3em]">Atelier di Bellezza</p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 text-red-600 animate-shake leading-relaxed text-[10px] font-bold border border-red-100">
            <i className="fas fa-exclamation-triangle mr-2"></i> {errorMsg}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {isRegistering && (
            <>
              <input type="text" placeholder="Nome e Cognome" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-amber-400 text-sm" />
              <input type="tel" placeholder="Cellulare (es. +41...)" required value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-amber-400 text-sm" />
            </>
          )}
          <input type="email" placeholder="Email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-amber-400 text-sm" />
          <input type="password" placeholder="Password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-4 rounded-2xl bg-gray-50 border-none outline-none focus:ring-2 focus:ring-amber-400 text-sm" />
          
          <button type="submit" disabled={loading} className="w-full py-4 bg-gray-900 text-white font-bold rounded-2xl hover:bg-black transition-all shadow-xl disabled:opacity-50">
            {loading ? <i className="fas fa-circle-notch animate-spin"></i> : (isRegistering ? 'Crea il mio account' : 'Entra in Atelier')}
          </button>
        </form>

        <div className="mt-8 relative flex items-center py-2">
          <div className="flex-grow border-t border-gray-100"></div>
          <span className="flex-shrink mx-4 text-[8px] text-gray-300 uppercase tracking-widest font-bold">Oppure</span>
          <div className="flex-grow border-t border-gray-100"></div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <button type="button" onClick={signInWithGoogle} className="flex items-center justify-center space-x-2 py-4 border border-gray-100 rounded-2xl hover:bg-gray-50 transition-all group">
            <i className="fab fa-google text-red-500 group-hover:scale-110 transition-transform"></i>
            <span className="text-[10px] font-bold uppercase">Google</span>
          </button>
          <button type="button" className="flex items-center justify-center space-x-2 py-4 border border-gray-100 rounded-2xl hover:bg-gray-50 transition-all opacity-40 cursor-not-allowed">
            <i className="fab fa-apple text-gray-900"></i>
            <span className="text-[10px] font-bold uppercase">Apple ID</span>
          </button>
        </div>

        <div className="mt-8 text-center">
          <button onClick={() => { setIsRegistering(!isRegistering); setErrorMsg(''); }} className="text-[10px] font-bold text-gray-400 hover:text-amber-600 transition-colors uppercase tracking-widest">
            {isRegistering ? 'Hai già un profilo? Accedi' : 'Non hai un profilo? Registrati'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
