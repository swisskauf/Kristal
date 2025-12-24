
import React, { useState } from 'react';
import { AbsenceType, LeaveRequest, AbsenceEntry } from '../types';

interface QuickRequestModalProps {
  date: string;
  memberName: string;
  existingRequest?: LeaveRequest;
  existingAbsence?: AbsenceEntry;
  onClose: () => void;
  onAction: (action: 'create' | 'cancel' | 'revoke', data?: { type: AbsenceType, notes?: string, isFullDay: boolean, startTime?: string, endTime?: string }) => void;
}

const QuickRequestModal: React.FC<QuickRequestModalProps> = ({ date, memberName, existingRequest, existingAbsence, onClose, onAction }) => {
  const [selectedType, setSelectedType] = useState<AbsenceType>(existingRequest?.type || 'vacation');
  const [isFullDay, setIsFullDay] = useState(true);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('13:00');
  const [notes, setNotes] = useState('');

  const readableDate = new Date(date).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', weekday: 'long' });
  const isPending = existingRequest?.status === 'pending';
  const isApproved = existingAbsence !== undefined;

  const typeConfig: Record<AbsenceType, { label: string, icon: string, color: string }> = {
    vacation: { label: 'Ferie', icon: 'fa-umbrella-beach', color: 'text-blue-500' },
    sick: { label: 'Malattia', icon: 'fa-briefcase-medical', color: 'text-red-500' },
    injury: { label: 'Infortunio', icon: 'fa-crutch', color: 'text-orange-500' },
    training: { label: 'Formazione', icon: 'fa-graduation-cap', color: 'text-emerald-500' },
    unpaid: { label: 'Giorno Libero', icon: 'fa-leaf', color: 'text-gray-400' },
    permit: { label: 'Permesso Orario', icon: 'fa-clock', color: 'text-purple-500' },
    overtime: { label: 'Recupero Ore', icon: 'fa-history', color: 'text-amber-500' },
    availability_change: { label: 'Cambio Orario', icon: 'fa-exchange-alt', color: 'text-gray-500' },
    bereavement: { label: 'Lutto', icon: 'fa-ribbon', color: 'text-gray-900' },
    maternity: { label: 'Maternità', icon: 'fa-baby', color: 'text-pink-500' },
    paternity: { label: 'Paternità', icon: 'fa-baby-carriage', color: 'text-blue-400' }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-6 right-6 text-gray-300 hover:text-black transition-colors">
          <i className="fas fa-times text-lg"></i>
        </button>

        <header className="mb-8">
          <p className="text-amber-600 text-[9px] font-bold uppercase tracking-widest mb-1">Rituale Gestione Tempo</p>
          <h3 className="text-2xl font-luxury font-bold text-gray-900">{readableDate}</h3>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter mt-1">Artista: {memberName}</p>
        </header>

        {isPending ? (
          <div className="space-y-6">
            <div className={`p-6 bg-amber-50 rounded-3xl border border-amber-100`}>
              <div className="flex items-center gap-3 mb-2">
                <i className={`fas ${typeConfig[existingRequest?.type || 'vacation'].icon} text-amber-600`}></i>
                <p className="text-[10px] font-bold text-amber-700 uppercase">Richiesta Pendente</p>
              </div>
              <p className="text-xs text-amber-900 leading-relaxed italic">
                Hai richiesto <strong>{typeConfig[existingRequest?.type || 'vacation'].label}</strong> {existingRequest?.is_full_day ? 'per tutto il giorno' : `dalle ${existingRequest?.start_time} alle ${existingRequest?.end_time}`}.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => onAction('cancel')}
                className="w-full py-4 bg-red-500 text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-lg hover:bg-red-600 transition-all"
              >
                Annulla e Rendi Disponibile
              </button>
              <button onClick={onClose} className="w-full py-4 text-gray-400 font-bold uppercase text-[9px]">Mantieni Richiesta</button>
            </div>
          </div>
        ) : isApproved ? (
          <div className="space-y-6">
            <div className="p-6 bg-gray-50 rounded-3xl border border-gray-100">
              <div className="flex items-center gap-3 mb-2">
                <i className={`fas ${typeConfig[existingAbsence?.type || 'vacation'].icon} text-gray-400`}></i>
                <p className="text-[10px] font-bold text-gray-400 uppercase">Assenza Confermata</p>
              </div>
              <p className="text-xs text-gray-900 leading-relaxed italic">
                Questo slot è ufficialmente segnato come <strong>{typeConfig[existingAbsence?.type || 'vacation'].label}</strong>.
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-bold text-gray-400 uppercase ml-1">Motivazione Revoca</label>
              <textarea 
                value={notes} 
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Perché desideri tornare operativo?"
                className="w-full p-4 rounded-2xl bg-gray-50 border-none text-xs outline-none focus:ring-2 focus:ring-amber-500 transition-all resize-none"
                rows={3}
              />
            </div>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => onAction('revoke', { type: 'availability_change', notes, isFullDay: true })}
                className="w-full py-4 bg-black text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-lg"
              >
                Invia Richiesta di Revoca
              </button>
              <button onClick={onClose} className="w-full py-4 text-gray-400 font-bold uppercase text-[9px]">Indietro</button>
            </div>
          </div>
        ) : (
          <div className="space-y-6 overflow-y-auto max-h-[60vh] pr-2 scrollbar-hide">
            <div className="space-y-4">
              <label className="text-[9px] font-bold text-gray-400 uppercase ml-1">Tipo di Assenza</label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(typeConfig) as [AbsenceType, any][]).slice(0, 6).map(([type, config]) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSelectedType(type)}
                    className={`p-3 rounded-2xl border flex items-center gap-3 transition-all ${selectedType === type ? 'bg-black text-white border-black shadow-md' : 'bg-white border-gray-100 text-gray-400 hover:border-amber-200'}`}
                  >
                    <i className={`fas ${config.icon} text-xs`}></i>
                    <span className="text-[9px] font-bold uppercase tracking-tighter">{config.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[9px] font-bold text-gray-400 uppercase ml-1">Copertura</label>
              <div className="flex bg-gray-50 p-1 rounded-2xl">
                <button 
                  type="button"
                  onClick={() => setIsFullDay(true)}
                  className={`flex-1 py-2 text-[9px] font-bold uppercase rounded-xl transition-all ${isFullDay ? 'bg-white text-black shadow-sm' : 'text-gray-400'}`}
                >
                  Giorno Intero
                </button>
                <button 
                  type="button"
                  onClick={() => setIsFullDay(false)}
                  className={`flex-1 py-2 text-[9px] font-bold uppercase rounded-xl transition-all ${!isFullDay ? 'bg-white text-black shadow-sm' : 'text-gray-400'}`}
                >
                  Fascia Oraria
                </button>
              </div>

              {!isFullDay && (
                <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                  <div className="space-y-1">
                    <span className="text-[8px] font-bold text-gray-300 uppercase ml-1">Dalle</span>
                    <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full p-3 bg-gray-50 rounded-xl border-none text-xs font-bold" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[8px] font-bold text-gray-300 uppercase ml-1">Alle</span>
                    <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full p-3 bg-gray-50 rounded-xl border-none text-xs font-bold" />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-bold text-gray-400 uppercase ml-1">Annotazioni</label>
              <textarea 
                value={notes} 
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Dettagli aggiuntivi per la direzione..."
                className="w-full p-4 rounded-2xl bg-gray-50 border-none text-xs outline-none focus:ring-2 focus:ring-amber-500 transition-all resize-none"
                rows={2}
              />
            </div>

            <div className="flex flex-col gap-3 pt-4">
              <button 
                onClick={() => onAction('create', { type: selectedType, notes, isFullDay, startTime, endTime })}
                className="w-full py-4 bg-black text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest shadow-xl hover:bg-amber-600 transition-all"
              >
                Invia Richiesta
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
