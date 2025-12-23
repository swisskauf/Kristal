
import React, { useState } from 'react';
import { Service } from '../types';

interface ServiceFormProps {
  onSave: (service: Partial<Service>) => void;
  onCancel: () => void;
  initialData?: Service;
}

const ServiceForm: React.FC<ServiceFormProps> = ({ onSave, onCancel, initialData }) => {
  const [name, setName] = useState(initialData?.name || '');
  const [price, setPrice] = useState(initialData?.price || 0);
  const [duration, setDuration] = useState(initialData?.duration || 30);
  const [category, setCategory] = useState(initialData?.category || 'Donna');
  const [description, setDescription] = useState(initialData?.description || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: initialData?.id || Math.random().toString(36).substr(2, 9),
      name,
      price: Number(price),
      duration: Number(duration),
      category,
      description
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
      <div className="space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-amber-600 uppercase tracking-widest ml-1">Nome del Ritual</label>
          <input 
            type="text" 
            required 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            placeholder="es. Balayage Crystal"
            className="w-full p-5 rounded-3xl bg-gray-50 border border-gray-100 outline-none focus:ring-2 focus:ring-amber-500 font-bold text-sm shadow-sm transition-all"
          />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-amber-600 uppercase tracking-widest ml-1">Prezzo (CHF)</label>
            <input 
              type="number" 
              required 
              value={price} 
              onChange={(e) => setPrice(Number(e.target.value))} 
              className="w-full p-5 rounded-3xl bg-gray-50 border border-gray-100 outline-none focus:ring-2 focus:ring-amber-500 font-bold text-sm shadow-sm transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-amber-600 uppercase tracking-widest ml-1">Durata (Min)</label>
            <input 
              type="number" 
              required 
              value={duration} 
              onChange={(e) => setDuration(Number(e.target.value))} 
              className="w-full p-5 rounded-3xl bg-gray-50 border border-gray-100 outline-none focus:ring-2 focus:ring-amber-500 font-bold text-sm shadow-sm transition-all"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold text-amber-600 uppercase tracking-widest ml-1">Categoria</label>
          <select 
            value={category} 
            onChange={(e) => setCategory(e.target.value)}
            className="w-full p-5 rounded-3xl bg-gray-50 border border-gray-100 outline-none focus:ring-2 focus:ring-amber-500 font-bold text-sm shadow-sm transition-all"
          >
            {['Donna', 'Uomo', 'Colore', 'Trattamenti', 'Estetica'].map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-bold text-amber-600 uppercase tracking-widest ml-1">Descrizione Evocativa</label>
          <textarea 
            value={description} 
            onChange={(e) => setDescription(e.target.value)} 
            rows={3}
            placeholder="Descrivete l'esperienza..."
            className="w-full p-5 rounded-3xl bg-gray-50 border border-gray-100 outline-none focus:ring-2 focus:ring-amber-500 font-bold text-sm shadow-sm transition-all resize-none"
          />
        </div>
      </div>

      <div className="flex gap-4 pt-8 border-t border-gray-100">
        <button type="button" onClick={onCancel} className="flex-1 py-5 text-gray-400 font-bold uppercase text-[10px] tracking-widest hover:text-gray-900 transition-colors">Annulla</button>
        <button type="submit" className="flex-[2] py-5 bg-black text-white font-bold rounded-3xl shadow-2xl hover:bg-amber-700 transition-all uppercase text-[10px] tracking-widest">
          {initialData?.id ? 'Aggiorna Ritual' : 'Crea Ritual'}
        </button>
      </div>
    </form>
  );
};

export default ServiceForm;
