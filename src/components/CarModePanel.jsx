import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { translations } from '../utils/translations';
import { X, Maximize, BatteryMedium, Car, Map } from 'lucide-react';
import CarModeStationsList from './CarModeStationsList';

const CHARGETRIP_CLIENT_ID = import.meta.env.VITE_CHARGETRIP_CLIENT_ID;
const CHARGETRIP_APP_ID = import.meta.env.VITE_CHARGETRIP_APP_ID;

export default function CarModePanel() {
  const language = useStore((state) => state.language);
  const carModeOpen = useStore((state) => state.carModeOpen);
  const setCarModeOpen = useStore((state) => state.setCarModeOpen);
  
  const carModel = useStore((state) => state.carModel);
  const setCarModel = useStore((state) => state.setCarModel);
  const batteryLevel = useStore((state) => state.batteryLevel);
  const setBatteryLevel = useStore((state) => state.setBatteryLevel);
  const routeData = useStore((state) => state.routeData);

  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const t = translations[language];

  useEffect(() => {
    if (search.length < 2) {
      setResults([]);
      return;
    }
    
    const timeoutId = setTimeout(async () => {
      setLoading(true);
      try {
        const query = `
          query vehicleList($search: String) {
            vehicleList(search: $search, size: 5) {
              id naming { make model version }
              range { chargetrip_range { best } }
              media { image { url } }
            }
          }
        `;
        const response = await fetch('https://api.chargetrip.io/graphql', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-client-id': CHARGETRIP_CLIENT_ID,
            'x-app-id': CHARGETRIP_APP_ID,
          },
          body: JSON.stringify({ query, variables: { search } })
        });
        const json = await response.json();
        setResults(json.data.vehicleList || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [search]);

  const [localBatteryLevel, setLocalBatteryLevel] = useState(batteryLevel);

  useEffect(() => {
    const timer = setTimeout(() => {
      setBatteryLevel(localBatteryLevel);
    }, 50);
    return () => clearTimeout(timer);
  }, [localBatteryLevel, setBatteryLevel]);



  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error("Error attempting to enable fullscreen:", err);
      });
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div className={`fixed inset-0 z-[1100] bg-white flex flex-col transition-transform duration-200 ease-in-out ${carModeOpen ? 'translate-y-0' : 'translate-y-full pointer-events-none'}`}>
      <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-white/50">
        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">{t.carMode}</h2>
        <div className="flex gap-3">
          <button onClick={toggleFullscreen} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors flex items-center gap-2">
            <Maximize size={18} /> {t.landscapeMode}
          </button>
          <button onClick={() => setCarModeOpen(false)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors flex items-center gap-2 shadow-lg shadow-emerald-500/20">
            <X size={18} /> {t.exitCarMode}
          </button>
        </div>
      </div>

      <div className="p-8 bg-slate-50/50 border-b border-slate-100 flex flex-col md:flex-row gap-8">
        <div className="flex-[2] relative">
          <label className="text-xs text-slate-500 uppercase tracking-[0.2em] font-black mb-3 block">{t.carModel}</label>
          <div className="relative group">
            <input 
              type="text" 
              placeholder={t.searchCarPlaceholder} 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border-2 border-slate-200 rounded-2xl px-6 py-5 text-xl text-slate-700 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all font-bold shadow-sm"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300">
              <Car size={24} />
            </div>
          </div>
          {results.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-3 bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden z-[1000] animate-in fade-in slide-in-from-top-2 duration-200">
              {results.map(v => (
                <div 
                  key={v.id} 
                  className="px-6 py-4 hover:bg-emerald-50 cursor-pointer text-slate-700 border-b border-slate-100 last:border-0 transition-colors"
                  onClick={() => {
                    setCarModel({ 
                      name: `${v.naming.make} ${v.naming.model} ${v.naming.version || ''}`.trim(), 
                      range: v.range?.chargetrip_range?.best || 400,
                      image: v.media?.image?.url
                    });
                    setSearch('');
                    setResults([]);
                  }}
                >
                  <div className="flex items-center gap-4">
                    {v.media?.image?.url ? (
                      <img src={v.media.image.url} alt={v.naming.model} className="w-16 h-12 object-contain bg-slate-50 rounded-lg" />
                    ) : (
                      <div className="w-16 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                        <Car size={20} className="text-slate-300" />
                      </div>
                    )}
                    <div>
                      <div className="font-black text-lg">{v.naming.make} {v.naming.model}</div>
                      <div className="text-sm text-slate-500 font-bold">Range: {v.range?.chargetrip_range?.best || 400} km</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {carModel && (
            <div className="mt-4 p-4 bg-emerald-50 rounded-2xl border-2 border-emerald-100 flex items-center gap-4 animate-in fade-in slide-in-from-left-4 duration-300 relative group">
              <button 
                onClick={() => setCarModel(null)}
                className="absolute -top-2 -right-2 w-8 h-8 bg-white border-2 border-emerald-100 rounded-full flex items-center justify-center text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-emerald-500 hover:text-white"
              >
                <X size={14} />
              </button>
              {carModel.image ? (
                <img src={carModel.image} alt={carModel.name} className="w-24 h-16 object-contain drop-shadow-xl" />
              ) : (
                <div className="w-24 h-16 bg-white/50 rounded-xl flex items-center justify-center">
                  <Car size={32} className="text-emerald-200" />
                </div>
              )}
              <div className="flex flex-col">
                <span className="text-xs text-emerald-400 font-black uppercase tracking-widest mb-1">Active Vehicle</span>
                <span className="text-xl font-black text-emerald-900 leading-tight">{carModel.name}</span>
                <span className="text-sm text-emerald-600 font-bold tracking-wide">Max Range: {carModel.range} km</span>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex-1">
          <label className="text-xs text-slate-500 uppercase tracking-[0.2em] font-black mb-3 flex items-center gap-2">
            <BatteryMedium size={16} className="text-emerald-500"/> {t.batteryLevel}
          </label>
          <div className="flex items-center gap-6 bg-white border-2 border-slate-200 rounded-2xl px-6 py-4 shadow-sm h-[68px]">
            <input 
              type="range" 
              min="1" max="100" 
              value={localBatteryLevel}
              onChange={(e) => setLocalBatteryLevel(Number(e.target.value))}
              className="flex-1 accent-emerald-500 cursor-pointer h-2 rounded-lg bg-slate-100 appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:bg-emerald-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:border-4 [&::-webkit-slider-thumb]:border-white"
            />
            <span className="text-3xl font-black text-slate-800 min-w-[4.5rem] text-right tracking-tight">{localBatteryLevel}%</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col bg-white">
        {!routeData ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-slate-50/30">
            <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mb-8 shadow-xl shadow-slate-200/50 border-4 border-slate-50">
              <Map size={64} className="text-slate-200" />
            </div>
            <h3 className="text-3xl font-black text-slate-800 mb-4">{t.noRouteNotice}</h3>
            <p className="text-slate-400 font-bold uppercase tracking-[0.2em]">{t.planRouteBtn}</p>
          </div>
        ) : (
          <CarModeStationsList />
        )}
      </div>
    </div>
  );
}
