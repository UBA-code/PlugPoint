import React from 'react';
import { useStore } from '../store/useStore';
import { translations } from '../utils/translations';
import { Map, Car, Menu, X } from 'lucide-react';
import { useState } from 'react';

export default function Header() {
  const language = useStore((state) => state.language);
  const setLanguage = useStore((state) => state.setLanguage);
  const routePanelOpen = useStore((state) => state.routePanelOpen);
  const setRoutePanelOpen = useStore((state) => state.setRoutePanelOpen);
  const carModeOpen = useStore((state) => state.carModeOpen);
  const setCarModeOpen = useStore((state) => state.setCarModeOpen);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const t = translations[language];

  return (
    <header className="absolute top-4 left-1/2 -translate-x-1/2 w-[95%] max-w-[1200px] z-[1100]
      bg-white/80 backdrop-blur-md border border-slate-200 rounded-2xl p-4 shadow-xl flex flex-col lg:flex-row justify-between items-center gap-4
      transition-all duration-300">
      <div className="flex items-center justify-between w-full lg:w-auto gap-4" dir="ltr">
        <h1 className="text-2xl font-black text-slate-800 tracking-tight whitespace-nowrap" dangerouslySetInnerHTML={{ __html: t.title }} />
        
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 rounded-xl p-1 border border-slate-200 scale-90 sm:scale-100">
            {['en', 'fr', 'ar'].map((lang) => (
              <button
                key={lang}
                onClick={() => setLanguage(lang)}
                className={`px-2 sm:px-3 py-1 rounded-lg text-xs font-black transition-all duration-300 uppercase
                  ${language === lang ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                {lang}
              </button>
            ))}
          </div>

          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 bg-slate-100 rounded-xl text-slate-600 lg:hidden hover:bg-slate-200 transition-all duration-300"
          >
            <div className={`transition-transform duration-300 ${isMenuOpen ? 'rotate-90' : 'rotate-0'}`}>
              {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </div>
          </button>
        </div>
      </div>

      <div className={`overflow-hidden transition-all duration-300 flex flex-row items-center justify-center gap-3 lg:gap-4 w-full lg:w-auto
        ${isMenuOpen ? 'max-h-[200px] opacity-100 mt-2' : 'max-h-0 opacity-0 lg:max-h-none lg:opacity-100 lg:mt-0'}`}>
        <button
          onClick={() => setRoutePanelOpen(!routePanelOpen)}
          className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all duration-300 flex-1 lg:flex-none justify-center
            ${routePanelOpen ? 'bg-blue-600 text-white shadow-lg scale-105' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
        >
          <Map size={18} />
          {t.routeBtn}
        </button>
        <button
          onClick={() => setCarModeOpen(!carModeOpen)}
          className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all duration-300 flex-1 lg:flex-none justify-center
            ${carModeOpen ? 'bg-emerald-600 text-white shadow-lg scale-105' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
        >
          <Car size={18} />
          {t.carMode}
        </button>
      </div>
    </header>
  );
}
