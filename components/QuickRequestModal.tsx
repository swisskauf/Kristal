
import React, { useState } from 'react';
import { AbsenceType, LeaveRequest, AbsenceEntry } from '../types';

interface QuickRequestModalProps {
  date: string;
  memberName: string;
  existingRequest?: LeaveRequest;
  existingAbsence?: AbsenceEntry;
  onClose: () => void;
  onAction: (action: 'create' | 'cancel' | 'revoke', type?: AbsenceType, notes?: string) => void;
}

const QuickRequestModal: React.FC<QuickRequestModalProps> = ({ date, memberName, existingRequest, existingAbsence, onClose, onAction }) => {
  const [selectedType, setSelectedType] = useState<AbsenceType>('vacation');
  const [notes, setNotes] = useState('');

  const readableDate = new Date(date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', weekday: 'long' });
  const isPending = existingRequest?.status === 'pending';
  const isApproved = existingAbsence !== undefined;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-6 right-6 text-gray-300 hover:text-black transition-colors">
          <i className="fas fa-times text-lg"></i>
        </button>

        <header className="mb-8">
          <p className="text-amber-600 text-[9px] font-bold uppercase tracking-widest mb-1">Gestione Disponibilità</p>
          <h3 className="text-2xl font-luxury font-bold text-gray-900">{readableDate}</h3>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter mt-1">Specialista: {memberName}</p>
        </header>

        {isPending ? (
          <div className="space-y-6">
            <div className="p-6 bg-amber-50 rounded-3xl border border-amber-100">
              <p className="text-[10px] font-bold text-amber-700 uppercase mb-2">Richiesta in attesa</p>
              <p className="text-xs text-amber-900 leading-relaxed italic">"Avete richiesto un congedo di tipo <strong>{existingRequest?.type}</strong> per questo giorno. La direzione non ha ancora deliberato."</p>
            </div>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => onAction('cancel')}
                className="w-full py-4 bg-red-500 text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-lg hover:bg-red-600 transition-all"
              >
                Annulla Richiesta
              </button>
              <button onClick={onClose} className="w-full py-4 text-gray-400 font-bold uppercase text-[9px]">Chiudi</button>
            </div>
          </div>
        ) : isApproved ? (
          <div className="space-y-6">
            <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Congedo Approvato</p>
              <p className="text-xs text-gray-900 leading-relaxed italic">"Questo giorno è segnato come <strong>{existingAbsence?.type}</strong>. Per tornare disponibile, inviate una richiesta di revoca."</p>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-bold text-gray-400 uppercase ml-1">Motivazione Revoca</label>
              <textarea 
                value={notes} 
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Spiegate perché volete tornare disponibili..."
                className="w-full p-4 rounded-2xl bg-gray-50 border-none text-xs outline-none focus:ring-2 focus:ring-amber-500 transition-all resize-none"
                rows={3}
              />
            </div>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => onAction('revoke', undefined, notes)}
                className="w-full py-4 bg-black text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-lg"
              >
                Invia Richiesta di Revoca
              </button>
              <button onClick={onClose} className="w-full py-4 text-gray-400 font-bold uppercase text-[9px]">Chiudi</button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[9px] font-bold text-gray-400 uppercase ml-1">Tipo di Assenza / Stato</label>
              <select 
                value={selectedType} 
                onChange={(e) => setSelectedType(e.target.value as AbsenceType)}
                className="w-full p-4 rounded-2xl bg-gray-50 border-none font-bold text-xs outline-none focus:ring-2 focus:ring-amber-500 transition-all"
              >
                <option value="vacation">Ferie / Vacanza</option>
                <option value="sick">Malattia</option>
                <option value="unpaid">Giorno Libero (Non Retribuito)</option>
                <option value="training">Formazione / Corso</option>
                <option value="overtime">Recupero Ore</option>
                <option value="availability_change">Cambio Disponibilità</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-bold text-gray-400 uppercase ml-1">Note (Opzionale)</label>
              <textarea 
                value={notes} 
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Dettagli per la direzione..."
                className="w-full p-4 rounded-2xl bg-gray-50 border-none text-xs outline-none focus:ring-2 focus:ring-amber-500 transition-all resize-none"
                rows={3}
              />
            </div>

            <div className="flex flex-col gap-3 pt-4">
              <button 
                onClick={() => onAction('create', selectedType, notes)}
                className="w-full py-4 bg-black text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-xl hover:bg-amber-600 transition-all"
              >
                Conferma e Invia
              </button>
              <button onClick={onClose} className="w-full py-4 text-gray-400 font-bold uppercase text-[9px]">Annulla</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuickRequestModal;
