
import React, { useState, useRef, useEffect } from 'react';
import { getAIConsultation } from '../services/geminiService';
import { ChatMessage, User } from '../types';

interface AIAssistantProps {
  user?: User | null;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ user }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', content: `Benvenuta in Kristal${user ? `, ${user.fullName.split(' ')[0]}` : ''}. Come posso esaltare la vostra bellezza oggi?` }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    const response = await getAIConsultation(userMsg, user || undefined);
    setMessages(prev => [...prev, { role: 'model', content: response }]);
    setIsLoading(false);
  };

  const renderContent = (content: string) => {
    const parts = content.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-bold text-gray-900">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 md:bottom-10 md:right-10 w-14 h-14 md:w-16 md:h-16 bg-black text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-all z-[600] border border-amber-500/20"
      >
        <i className={`fas ${isOpen ? 'fa-times' : 'fa-magic'} text-lg`}></i>
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-4 left-4 md:left-auto md:right-10 md:w-[360px] h-[450px] bg-white rounded-[2.5rem] shadow-[0_30px_60px_rgba(0,0,0,0.15)] border border-gray-100 flex flex-col z-[600] overflow-hidden animate-in slide-in-from-bottom-5 duration-500">
          <div className="bg-white p-6 border-b border-gray-50 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-amber-600 rounded-full flex items-center justify-center">
                <i className="fas fa-sparkles text-white text-[10px]"></i>
              </div>
              <span className="font-luxury font-bold text-xs tracking-tight text-gray-900">Beauty Concierge</span>
            </div>
          </div>
          
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#fcfcfc] scrollbar-hide">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[90%] p-4 rounded-3xl text-[11px] leading-relaxed shadow-sm ${
                  m.role === 'user' 
                    ? 'bg-black text-white rounded-br-none' 
                    : 'bg-white border border-gray-50 text-gray-600 rounded-bl-none'
                }`}>
                  {renderContent(m.content)}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white px-3 py-2 rounded-full border border-gray-50 flex space-x-1">
                  <div className="w-1 h-1 bg-amber-600 rounded-full animate-bounce"></div>
                  <div className="w-1 h-1 bg-amber-600 rounded-full animate-bounce [animation-delay:-0.2s]"></div>
                  <div className="w-1 h-1 bg-amber-600 rounded-full animate-bounce [animation-delay:-0.4s]"></div>
                </div>
              </div>
            )}
          </div>

          <div className="p-6 bg-white border-t border-gray-50">
            <div className="flex bg-gray-50 rounded-full p-1 border border-gray-100 items-center">
              <input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="In cosa posso aiutarvi?"
                className="flex-1 text-[11px] px-4 py-2 bg-transparent outline-none text-gray-700"
              />
              <button 
                onClick={handleSend}
                className="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center hover:bg-amber-600 transition-all"
              >
                <i className="fas fa-arrow-up text-[10px]"></i>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AIAssistant;
