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
  const [isPickerOpen, setIsPickerOpen] = useState(false);

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



  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        if (window.screen && window.screen.orientation && window.screen.orientation.lock) {
          try {
            await window.screen.orientation.lock('landscape');
          } catch (lockErr) {
            console.warn("Could not lock orientation:", lockErr);
          }
        }
      } else {
        if (window.screen && window.screen.orientation && window.screen.orientation.unlock) {
          window.screen.orientation.unlock();
        }
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error("Error toggling fullscreen:", err);
    }
  };

  return (
    <div className={`fixed inset-0 z-[1200] bg-white flex flex-col transition-transform duration-200 ease-in-out ${carModeOpen ? 'translate-y-0' : 'translate-y-full pointer-events-none'}`}>
      <div className="flex justify-between items-center p-3 md:p-4 border-b border-slate-100 bg-white/50">
        <h2 className="text-xl md:text-2xl font-black text-slate-800 flex items-center gap-2">{t.carMode}</h2>

        <div className="flex gap-3">
          <button 
            onClick={() => setIsPickerOpen(true)} 
            className="p-2 bg-slate-100 hover:bg-slate-200 text-emerald-600 rounded-xl transition-colors flex items-center justify-center lg:hidden"
            title="Choose Vehicle"
          >
            <Car size={22} />
          </button>
          <button onClick={toggleFullscreen} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors flex items-center gap-2">
            <Maximize size={18} /> {t.landscapeMode}
          </button>
          <button onClick={() => setCarModeOpen(false)} className="px-3 py-2 lg:px-4 lg:py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors flex items-center gap-2 shadow-lg shadow-emerald-500/20 text-sm lg:text-base">
            <X size={18} /> {t.exitCarMode}
          </button>

        </div>
      </div>

      <div className="lg:p-8 bg-slate-50/50 lg:border-b border-slate-100 flex flex-col lg:flex-row lg:gap-8 overflow-visible">
        <div className="flex-[2] flex flex-col relative overflow-visible">
          <label className="text-xs text-slate-500 uppercase tracking-[0.2em] font-black mb-3 hidden lg:flex items-center gap-2">
            <Car size={16} className="text-emerald-500"/> {t.carModel}
          </label>

          {/* Picker Overlay (Mobile) / Inline Picker (Desktop) */}
          <div className={`
            fixed inset-0 z-[2000] bg-white p-6 overflow-y-auto flex flex-col transition-all duration-500 ease-out
            ${isPickerOpen ? 'translate-y-0 opacity-100 visible' : 'translate-y-full opacity-0 invisible'}
            lg:relative lg:translate-y-0 lg:opacity-100 lg:visible lg:p-0 lg:block lg:z-auto lg:overflow-visible
          `}>
          {/* Modal Header (Mobile only) */}
          <div className="flex justify-between items-center mb-8 lg:hidden">
            <h3 className="text-2xl font-black text-slate-800">Select EV Model</h3>
            <button 
              onClick={() => setIsPickerOpen(false)} 
              className="p-3 bg-slate-100 rounded-2xl text-slate-600 hover:bg-slate-200 transition-colors"
            >
              <X size={24}/>
            </button>
          </div>

          <div className="relative group mb-6">
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

            {results.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-3 bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden z-[3000] animate-in fade-in slide-in-from-top-2 duration-200 max-h-[300px] overflow-y-auto">
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
          </div>

          {/* Current Selection inside Modal */}
          {carModel && (
            <div className="mb-6 p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-4 animate-in fade-in duration-300 lg:hidden">
              {carModel.image ? (
                <img src={carModel.image} alt={carModel.name} className="w-20 h-12 object-contain" />
              ) : (
                <div className="w-20 h-12 bg-white/50 rounded-lg flex items-center justify-center">
                  <Car size={24} className="text-emerald-200" />
                </div>
              )}
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] text-emerald-400 font-black uppercase tracking-widest leading-none mb-1">Current Selection</span>
                <span className="text-base font-black text-emerald-900 leading-tight truncate">{carModel.name}</span>
              </div>
              <button 
                onClick={() => setCarModel(null)}
                className="ml-auto p-2 hover:bg-emerald-100 rounded-xl text-emerald-500 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Battery Control inside Modal (Mobile only) */}
          <div className="lg:hidden mb-8 bg-slate-50 p-6 rounded-3xl border border-slate-100">
            <label className="text-xs text-slate-500 uppercase tracking-[0.2em] font-black mb-4 flex items-center gap-2">
              <BatteryMedium size={16} className="text-emerald-500"/> {t.batteryLevel}
            </label>
            <div className="flex items-center gap-6 bg-white border-2 border-slate-200 rounded-2xl px-6 py-4 shadow-sm h-[68px]">
              <input 
                type="range" 
                min="1" max="100" 
                value={localBatteryLevel}
                onChange={(e) => setLocalBatteryLevel(Number(e.target.value))}
                className="flex-1 accent-emerald-500 cursor-pointer h-3 rounded-lg bg-slate-100 appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-10 [&::-webkit-slider-thumb]:h-10 [&::-webkit-slider-thumb]:bg-emerald-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-xl [&::-webkit-slider-thumb]:border-4 [&::-webkit-slider-thumb]:border-white"
              />
              <span className="text-4xl font-black text-slate-800 min-w-[5.5rem] text-right tracking-tight">{localBatteryLevel}%</span>
            </div>
          </div>
        </div>


        </div>
        
        <div className="flex-1 hidden lg:block">
          <label className="text-xs text-slate-500 uppercase tracking-[0.2em] font-black mb-3 flex items-center gap-2">
            <BatteryMedium size={16} className="text-emerald-500"/> {t.batteryLevel}
          </label>
          <div className="flex items-center gap-6 bg-white border-2 border-slate-200 rounded-2xl px-6 py-4 shadow-sm h-[68px]">
            <input 
              type="range" 
              min="1" max="100" 
              value={localBatteryLevel}
              onChange={(e) => setLocalBatteryLevel(Number(e.target.value))}
              className="flex-1 accent-emerald-500 cursor-pointer h-3 rounded-lg bg-slate-100 appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-10 [&::-webkit-slider-thumb]:h-10 [&::-webkit-slider-thumb]:bg-emerald-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-xl [&::-webkit-slider-thumb]:border-4 [&::-webkit-slider-thumb]:border-white"
            />
            <span className="text-4xl font-black text-slate-800 min-w-[5.5rem] text-right tracking-tight">{localBatteryLevel}%</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col bg-white">
        {!routeData ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 lg:p-12 bg-slate-50/30 overflow-y-auto">
            <div className="w-24 h-24 lg:w-32 lg:h-32 bg-white rounded-full flex items-center justify-center mb-6 lg:mb-8 shadow-xl shadow-slate-200/50 border-4 border-slate-50 shrink-0">
              <Map size={48} className="text-slate-200 lg:hidden" />
              <Map size={64} className="text-slate-200 hidden lg:block" />
            </div>
            <h3 className="text-2xl lg:text-3xl font-black text-slate-800 mb-2 lg:mb-4 px-4">{t.noRouteNotice}</h3>
            <p className="text-emerald-600 font-black uppercase tracking-[0.2em] text-sm lg:text-base border-2 border-emerald-100 px-6 py-2 rounded-full bg-emerald-50 shadow-sm">
              {t.planRouteBtn}
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-6">
            {carModel && !isPickerOpen && (
              <div className="p-6 bg-emerald-50 rounded-3xl border-2 border-emerald-100 flex items-center gap-6 animate-in fade-in slide-in-from-left-4 duration-300 relative group">
                <button 
                  onClick={() => setCarModel(null)}
                  className="absolute -top-3 -right-3 w-10 h-10 bg-white border-2 border-emerald-100 rounded-full flex items-center justify-center text-emerald-500 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-emerald-500 hover:text-white z-10"
                >
                  <X size={18} />
                </button>
                {carModel.image ? (
                  <img src={carModel.image} alt={carModel.name} className="w-32 h-20 object-contain drop-shadow-2xl" />
                ) : (
                  <div className="w-32 h-20 bg-white/50 rounded-2xl flex items-center justify-center">
                    <Car size={40} className="text-emerald-200" />
                  </div>
                )}
                <div className="flex flex-col">
                  <span className="text-xs lg:text-sm text-emerald-400 font-black uppercase tracking-[0.2em] mb-1">Active Vehicle</span>
                  <span className="text-3xl lg:text-4xl font-black text-emerald-900 leading-tight">{carModel.name}</span>
                  <span className="text-lg lg:text-xl text-emerald-600 font-bold tracking-wide">Max Range: {carModel.range} km</span>
                </div>
              </div>
            )}
            <CarModeStationsList />
          </div>
        )}
      </div>
    </div>
  );
}
