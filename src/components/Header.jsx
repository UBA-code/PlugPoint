import React from 'react';
import { useStore } from '../store/useStore';
import { translations } from '../utils/translations';
import { Map, Car } from 'lucide-react';

export default function Header() {
  const language = useStore((state) => state.language);
  const setLanguage = useStore((state) => state.setLanguage);
  const routePanelOpen = useStore((state) => state.routePanelOpen);
  const setRoutePanelOpen = useStore((state) => state.setRoutePanelOpen);
  const carModeOpen = useStore((state) => state.carModeOpen);
  const setCarModeOpen = useStore((state) => state.setCarModeOpen);

  const t = translations[language];

  return (
    <header className="absolute top-4 left-1/2 -translate-x-1/2 w-[95%] max-w-[1200px] z-1000
      bg-white/80 backdrop-blur-md border border-slate-200 rounded-2xl p-4 shadow-xl flex justify-between items-center
      transition-all duration-300">
      <div className="flex items-center space-x-2" dir="ltr">
        <h1 className="text-2xl font-black text-slate-800 tracking-tight" dangerouslySetInnerHTML={{ __html: t.title }} />
      </div>
      <div className="flex items-center gap-4">
        <button
          onClick={() => setRoutePanelOpen(!routePanelOpen)}
          className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all duration-300
            ${routePanelOpen ? 'bg-blue-600 text-white shadow-lg scale-105' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
        >
          {t.routeBtn}
        </button>
        <button
          onClick={() => setCarModeOpen(!carModeOpen)}
          className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all duration-300
            ${carModeOpen ? 'bg-emerald-600 text-white shadow-lg scale-105' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
        >
          {t.carMode}
        </button>
        
        <div className="flex bg-slate-100 rounded-xl p-1 border border-slate-200">
          {['en', 'fr', 'ar'].map((lang) => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              className={`px-3 py-1 rounded-lg text-xs font-black transition-all duration-300 uppercase
                ${language === lang ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              {lang}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
